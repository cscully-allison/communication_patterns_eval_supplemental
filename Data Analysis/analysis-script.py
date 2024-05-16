from operator import pos
import pandas as pd
import numpy as np
import altair as alt
import json
import os
import statsmodels.api as sm
import statsmodels.stats as sm_stats
from statsmodels.stats.libqsturng import psturng

from scipy.stats import shapiro, normaltest, anderson
import pylab

from bioinfokit.analys import stat
import scikit_posthocs as sp

from pandas.core.arrays.integer import Int64Dtype
pd.options.mode.chained_assignment = None


def ANOVA_Scheffe_Posthoc(df, header="", labels=['Full Representation','Partial Representation','New Representation']):
    df_copy = df.copy()
    df_copy.columns = labels
    df_long = df_copy.melt(var_name="experiment_levels", value_name="accuracy")

    res = stat()
    res.anova_stat(df = df_long, res_var="accuracy", anova_model='accuracy ~ C(experiment_levels)')

    print('\n'+header+': ')
    print(res.anova_summary)

    print("Scheffe Post Hoc")
    posthoc_df = sp.posthoc_scheffe(df_long, val_col="accuracy", group_col="experiment_levels")
    observed = []
    for label_col in labels:
        for label_row in labels:
            if [label_row, label_col] not in observed and label_row != label_col:
                
                print("{} - {}: ".format(label_row.split()[0], label_col.split()[0]), posthoc_df[label_col][label_row])
                
                observed.append([label_col, label_row])
                observed.append([label_row, label_col])

    print("Tukey Post-Hoc")
    posthoc_df = sm_stats.multicomp.pairwise_tukeyhsd(df_long["accuracy"].values, df_long["experiment_levels"].values, alpha=0.01)
    print(posthoc_df)



def test_normalcy(df, labels=['Full Representation','Partial Representation','New Representation']):
    alpha = 0.05
    df_copy = df.copy()
    df_copy.columns = labels
    for col in df_copy.columns:

        print("\n\nColumn: {}".format(col))

        print("\nTest: Shapiro")
        stat, p = shapiro(df_copy[col])
        print("p: {}".format(p))
        if p > alpha:
            print('Sample looks Gaussian (fail to reject H0)')
        else:
            print('Sample does not look Gaussian (reject H0)')

        print("\nTest: D'Agoistino")
        stat, p = normaltest(df_copy[col])
        print("p: {}".format(p))
        if p > alpha:
            print('Sample looks Gaussian (fail to reject H0)')
        else:
            print('Sample does not look Gaussian (reject H0)')

        print("\nTest: Anderson")
        result = anderson(df_copy[col])
        print('Statistic: %.3f' % result.statistic)
        p = 0
        for i in range(len(result.critical_values)):
            sl, cv = result.significance_level[i], result.critical_values[i]
            if sl == 5.0:
                if result.statistic < result.critical_values[i]:
                    print('Significance Level - %.3f: %.3f, data looks normal (fail to reject H0)' % (sl, cv))
                else:
                    print('Significance Level - %.3f: %.3f, data does not look normal (reject H0)' % (sl, cv))

        # Output a histogram



def gen_qq_plots(df, header="", labels=['Full Representation','Partial Representation','New Representation']):
    df_copy = df.copy()
    df_copy.columns = labels

    for col in df_copy.columns:
        sm.qqplot(df_copy[col], line='s')
        pylab.savefig(header+"_"+col+".png")


def effect_sizes(df):
    df['sd_f_a'] = df['response_correct_abstract'] - df['response_correct']
    df['sd_p_a'] = df['response_correct_abstract'] - df['response_correct_partial']

    print("Effect size among responses between abstract and full representations: {}".format(df['sd_f_a'].mean()/df['sd_f_a'].std()))
    print("Effect size among responses between abstract and partial representations: {}".format(df['sd_p_a'].mean()/df['sd_p_a'].std()))

def accuracy(x):
    return x[x == 'true'].size/ x.size

def bootstrap_resampling(data,func,trials):
    sample_results = np.empty(trials)

    for i in range(0, trials):
        sample = np.random.choice(data, size=len(data))
        sample_results[i] = func(sample)
    
    return sample_results

def resample_accuracies(df, func, trials):
    resampled = {}
    for column in df:
        if column[1] == 'accuracy':
            resampled[column] = bootstrap_resampling(df[column], func, trials)
    
    return resampled

def output_confidence_intervals(df, func, trials):

    resamples = resample_accuracies(df, func, trials)
    conf_intervals = []

    for r in resamples:
        print("Sampled From", r)
        print("Mean: ", np.mean(resamples[r]))
        print("Variance: ", np.var(resamples[r]))
        conf_intervals.append(np.percentile(resamples[r], [2.5, 97.5]))
        print("Confidence_Interval: ", conf_intervals)

    return pd.DataFrame(resamples), conf_intervals


def output_error_bars(df, title = "chart", labels=['Full Representation','Partial Representation','New Representation'], filename='default'):
    df_copy = df.copy()
    df_copy.columns = labels

    df_long = df_copy.melt(var_name="experiment_levels", value_name="accuracy")

    error_bars = alt.Chart(df_long).mark_errorbar(extent='ci').encode(
        color=alt.Color('experiment_levels:N', legend=None),
        x=alt.X('accuracy:Q', scale=alt.Scale(zero=False), axis=alt.Axis(format="%", title="Accuracy")),
        y=alt.Y('experiment_levels:N', axis=alt.Axis(title="Factor Levels"))
    ).properties(title=title)

    means = alt.Chart(df_long).mark_point(filled=True, color='black').encode(
        x=alt.X('accuracy:Q', aggregate='mean'),
        y=alt.Y('experiment_levels:N')
    )

    chart = error_bars + means


    chart.save('data/Experiment_Data/'+filename+".html")
    return 

def cols_to_upper(df, cols):
    for col in cols:
        df[col] = df[col].str.upper()
    return df


def get_conf_mat_heatmap(responses, plotname):
    cm_categories = ['offset continuous', 'offset grouped', 'ring continuous', 'ring grouped', 'exchange grouped']
    cm_dfs = []

    print(responses.groupby(['question_num', 'note']).count())

    # break into question types
    for i, categ in enumerate(cm_categories):
        cm_dfs.append(responses.loc[(responses['note'].str.contains(categ) & (responses['question_type_left'] == 'categorization'))][['response', 'answer', 'question_num', 'question_category']])
        cm_categories[i] = categ.upper()

    for df in cm_dfs:
        df = cols_to_upper(df, ['response', 'answer'])

    conf_mat = pd.DataFrame(columns = cm_categories.append('EXCHANGE CONTINUOUS'))

    for i, df in enumerate(cm_dfs):
        patterns = df.loc[df['question_category'] == 'pattern']
        groupings = df.loc[df['question_category'] == 'grouping']
        patterns['key'] = [x for x in range(0, patterns.shape[0])]
        groupings['key'] = [x for x in range(0, groupings.shape[0])]

        patterns = patterns.set_index('key').join(groupings.set_index('key'), lsuffix='_patterns', rsuffix='_groupings')

        new_df = pd.DataFrame()

        new_df['truth'] = patterns['answer_patterns'].str.cat(patterns['answer_groupings'], sep=' ')
        new_df['responses'] = patterns['response_patterns'].str.cat(patterns['response_groupings'], sep=' ')

        new_df = new_df.groupby('responses').count().reset_index()
        
        # print(cm_categories[i]+'\n')
        # print(new_df, '\n\n')

        new_row_dict = {}
        for ndx, resp in enumerate(new_df['responses']):
            new_row_dict[resp] = new_df['truth'][ndx]

        new_row_dict['index'] = cm_categories[i]

        conf_mat = conf_mat.append(new_row_dict, ignore_index=True)


    # print(conf_mat)

    conf_mat = conf_mat.set_index('index')
    conf_mat = conf_mat[cm_categories]

    cols_1 = ['OC','OG','RC','RG','EG', 'EC']
    conf_mat.columns = cols_1

    ndx = ['OC','OG','RC','RG','EG']
    # conf_mat.index = ndx

    conf_mat['True Pattern'] = ndx


    print(conf_mat)
    columnar_conf_mat = conf_mat.melt(id_vars=['True Pattern'], value_vars=cols_1, var_name="User Classification", value_name="Classifications")
    print(columnar_conf_mat)

    chart = alt.Chart(columnar_conf_mat).mark_rect().encode(
        x=alt.X("User Classification", sort=None),
        y=alt.Y("True Pattern", sort=None),
        color=alt.Color("Classifications",
                scale=alt.Scale(domain=(0,35), scheme="blues"))
    )

    chart += alt.Chart(columnar_conf_mat).mark_text(
        fontSize=16
    ).encode(
        x=alt.X("User Classification", sort=None),
        y=alt.Y("True Pattern", sort=None),
        text='Classifications'
    )

    chart = chart.properties(
        width=300,
        height=300,
        title="Confusion Matrix for {} Representations".format(plotname)
    ).configure_legend(
        labelFontSize=16,
        titleFontSize=16
    ).configure_axis(
        labelFontSize=16,
        titleFontSize=16
    ).configure_title(
        fontSize=16
    )

    chart.save("{}.html".format(plotname))

def get_excluded_values(start, num_questions):
    arr = []
    for j in range(start, start+(num_questions*2)):
        if j % 2 == 0:
            arr.append('{}P'.format(j))
            arr.append('{}G'.format(j))
        else:
            arr.append('{}C0'.format(j))
            arr.append('{}I0'.format(j))

    return arr







'''
Main Program
'''

experiment_data = None
responses = pd.DataFrame()
demo_data = pd.DataFrame()
data_dir = 'data/Experiment_Data/'
# data_dir = 'data/Pilot_Data/'


# get data
for filename in os.listdir(data_dir):
    if 'dnu' not in filename and 'questions' not in filename and '.html' not in filename:
        with open('{}{}'.format(data_dir,filename), 'r+') as f:
            experiment_data = json.loads(f.read())
            demo_data = demo_data.append(experiment_data['bio'], ignore_index=True)
            for response in experiment_data['responses']:
                response['csp_id'] = experiment_data['bio']['csp_id']
            responses = responses.append(pd.DataFrame(experiment_data['responses']))

# get per-question metadata
with open("{}test_questions.json".format(data_dir), 'r+') as f:
    experiment_metadata = json.loads(f.read())

# break out tutorial questions from metadata
tutorial_patterns = pd.DataFrame(experiment_metadata['tutorial']['patterns']).drop(['question_sample', 'choices', 'question_text'], axis=1)

if(data_dir == 'data/Pilot_Data/'):
    tutorial_new_designs = pd.DataFrame(experiment_metadata['tutorial']['new_designs']).drop(['question_sample', 'choices', 'question_text'], axis=1)
else:
    tutorial_new_designs = pd.DataFrame(experiment_metadata['tutorial']['stride']).drop(['question_sample', 'choices', 'question_text'], axis=1)



# break out main questions from metadata
if(data_dir == 'data/Pilot_Data/'):
   question_md = pd.DataFrame(experiment_metadata['questions']).drop(['question_sample', 'choices', 'question_text'], axis=1)
else:
    question_md = pd.DataFrame(experiment_metadata['questions']['patterns']).drop(['choices', 'question_text'], axis=1)                      # patterns
    question_md = question_md.append(pd.DataFrame(experiment_metadata['questions']['stride']).drop(['choices', 'question_text'], axis=1))    # stride

# store height of the question chart in it's own column
question_md['q_height'] = pd.to_numeric(question_md['question_sample'].apply(lambda x: x['grid_size'][0]))
question_md = question_md.drop(['question_sample'], axis=1)


# peel off tutorial data
if(data_dir == 'data/Pilot_Data/'):
    responses = responses.loc[~responses['question'].str.contains('T')]
else:
    tutorial_resp = responses.loc[responses['state'] == 'tutorial']
    responses = responses.loc[responses['state'] == 'questions']

# join metadata with our response data
responses = responses.set_index('question').join(question_md.set_index('question_id'), lsuffix='_left', rsuffix='_right')
responses['question'] = responses.index
responses['question_num'] = pd.to_numeric(responses['question_num'])


# Output number of respondants for verification purposes
print("Number of Respondants: {}".format(responses.groupby('session').mean().shape[0]))



# check for invalid response sets
guard_questions = ['0P','0G','1C0','1I0']
invalid_responses = responses.loc[(responses['question'].isin(guard_questions)) & (responses['response_correct'] == 'false')] 
# print(invalid_responses[['session', 'csp_id', 'question', 'response_correct']])



# peel off responses we don't want to measure in upcoming analysis
# they are too few rows
excluded = get_excluded_values(12, 3)
excluded += get_excluded_values(28, 3)
excluded += get_excluded_values(44, 3)


responses = responses.loc[~(responses['question'].isin(excluded+guard_questions))]

if(data_dir != 'data/Pilot_Data/'):
    responses.loc[responses['question_category'] == 'stride', 'question_num'] += responses.loc[responses['question_type_left'] == 'categorization']['question_num'].max()

# sort data for organization
responses = responses.sort_values(['session', 'question_num'])


# we need responses per representation
unagg_pivot = responses.loc[(responses['representation'] == 'full') & (responses['abstract'] == False)]
unagg_pivot_2 = responses.loc[responses['representation'] == 'partial']
unagg_pivot_3 = responses.loc[(responses['abstract'] == True)]

unagg_pivot_2['question_num'] = unagg_pivot_2['question_num'] - unagg_pivot_2['question_num'][0]
unagg_pivot_3['question_num'] = unagg_pivot_3['question_num'] - unagg_pivot_3['question_num'][0]

unagg_pivot = unagg_pivot.set_index(['session', 'question_num'])
unagg_pivot_2 = unagg_pivot_2[["question_num", "response_correct", "question", "session"]].set_index(['session', 'question_num'])
unagg_pivot_3 = unagg_pivot_3[["question_num", "response_correct", "question", "session"]].set_index(['session', 'question_num'])

unagg_pivot = unagg_pivot.join(unagg_pivot_2, rsuffix="_partial")
unagg_pivot = unagg_pivot.join(unagg_pivot_3, rsuffix="_abstract")

unagg_pivot = unagg_pivot.reset_index()



'''
    ANALYSIS
'''

grp_unagg = unagg_pivot.loc[(unagg_pivot['question_category'] == 'grouping')]
pattern_unagg = unagg_pivot.loc[(unagg_pivot['question_category'] == 'pattern')]

# getting all questions where answers and repsonses are different
pattern_unagg = pattern_unagg.loc[(pattern_unagg['response_correct_abstract'] == 'false')]


# print(pattern_unagg.groupby(['question_abstract']).count())

grp_by_user = unagg_pivot.loc[(unagg_pivot['question_category'] == 'grouping')][['session','response_correct','response_correct_partial','response_correct_abstract']].groupby(['session']).agg([accuracy])
pattern_by_user = unagg_pivot.loc[(unagg_pivot['question_category'] == 'pattern')][['session','response_correct','response_correct_partial','response_correct_abstract']].groupby(['session']).agg([accuracy])

cat_by_user = unagg_pivot.loc[(unagg_pivot['question_type_left'] == 'categorization')][['session','response_correct','response_correct_partial','response_correct_abstract']].groupby(['session']).agg([accuracy])
dc_by_user = unagg_pivot.loc[(unagg_pivot['question_type_left'] == 'direct comparison')][['session','response_correct','response_correct_partial','response_correct_abstract']].groupby(['session']).agg([accuracy])
total_responses_by_user = unagg_pivot[['session','response_correct','response_correct_partial','response_correct_abstract']].groupby(['session']).agg([accuracy])




# output means with error bars for levels of IV across various slices of data

output_error_bars(total_responses_by_user, "Confidence Intervals for All Tasks", filename="all")
output_error_bars(dc_by_user, "Confidence Intervals for Stride Discrimination", filename="stride")
# output_error_bars(cat_by_user, "Confidence Intervals for All Categorization")
output_error_bars(grp_by_user, "Confidence Intervals for Grouping Categorization", filename="grouping")
output_error_bars(pattern_by_user, "Confidence Intervals for Pattern Categorization", filename="pattern")


ANOVA_Scheffe_Posthoc(total_responses_by_user, "All Questions")
ANOVA_Scheffe_Posthoc(dc_by_user, "Stride Questions")
ANOVA_Scheffe_Posthoc(cat_by_user, "Categorization Questions")
ANOVA_Scheffe_Posthoc(grp_by_user, "Categorization (Grouping) Questions")
ANOVA_Scheffe_Posthoc(pattern_by_user, "Categorization (Pattern) Questions")

test_normalcy(total_responses_by_user)

# #
# # Statistical analysis for power analysis
# #
# total_responses_by_user = total_responses_by_user.droplevel(1, axis=1)
# cat_by_user = cat_by_user.droplevel(1, axis=1)
# grp_by_user = grp_by_user.droplevel(1, axis=1)

# effect_sizes(cat_by_user)
# effect_sizes(grp_by_user)

'''
Demographic data
'''
#print metadata here
print(demo_data.groupby(['screen_width', 'screen_height']).count()['session'])
print(demo_data.groupby(['exper']).count()['session'])
print(demo_data.groupby(['representation-prefrence']).count()['session'])
print(demo_data.groupby(['gender']).count()['session'])
print(demo_data.groupby(['years']).count()['session'])

print(demo_data['years'].astype('int32').median())

# print(demo_data['tutorial-comments'])
for comment in demo_data['other-comments']:
    print(comment)





'''
 Confusion matrix based on question types.
'''
print('\n\n')

partial = responses.loc[responses['representation'] == 'partial']
partial = partial.loc[partial['question_type_left'] == 'categorization']
partial_wrong = partial.loc[partial['response_correct'] == 'false']

partial_wrong['partial_loc'] = [x['partial_loc'] for x in partial_wrong['other_characteristics']]


# get_conf_mat_heatmap(responses, 'all')
get_conf_mat_heatmap(responses.loc[(responses['representation'] == 'full') & (responses['abstract'] == False)], 'Full')
get_conf_mat_heatmap(partial, 'Partial')
get_conf_mat_heatmap(responses.loc[(responses['abstract'] == True)], 'New')



'''
Calculate times
'''
responses['rtime_s'] = (responses['finish'].astype(np.int64) - responses['start'].astype(np.int64))/1000
tutorial_resp['rtime_s'] = (tutorial_resp['finish'].astype(np.int64) - tutorial_resp['start'].astype(np.int64))/1000

one_respondant = responses.loc[responses['session'] == "1613784111.6603563"]

# print(one_respondant.loc[one_respondant['rtime_s'] < 2])

print(responses[['session', 'csp_id','rtime_s']].groupby(['session','csp_id']).agg(['median','max','min', 'mean']))

times = responses[['session', 'csp_id','rtime_s']].groupby(['session','csp_id']).agg(['median','max','min', 'mean'])

time_mean = times[('rtime_s','mean')].mean()
time_median = times[('rtime_s','median')].median()
time_max = times[('rtime_s','max')].max()
time_min = times[('rtime_s','min')].min()

print(time_median, time_max, time_min, time_mean)