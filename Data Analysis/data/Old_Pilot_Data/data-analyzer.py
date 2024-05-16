# imports
import glob
import json
import sys

from bokeh.io import show, output_file
from bokeh.layouts import gridplot
from bokeh.plotting import figure
from bokeh.core.properties import value
from bokeh.models import ColumnDataSource

import pandas as pd

fqflag = False
mqflag = True #default is old question set
showFlag = False
dir = '.'
dirs = []
NUMANSWERS = 4

#setargs as global variables
# bad practice I know but not crucial
# variables can be thought of
# as global constants
for i, arg in enumerate(sys.argv):
    if arg == '-d':
        dirs = [sys.argv[i+1]]
    if arg == '--dirs':
        nextNdx = i+1
        nextArg = sys.argv[nextNdx]

        while not nextArg.startswith('-') and sys.argv[nextNdx] is not None:
            dirs.append(nextArg)
            nextNdx += 1
            nextArg = sys.argv[nextNdx]

    if arg == '-mq':
        mqflag = True
        fqflag = False
    if arg == '-fq':
        fqflag = True
        mqflag = False
    if arg == '-show':
        shwFlag = True


def makeAggResponseCSV(responses, outpath):

    # build up tables
    # 3 tables
    allresponses = []
    respondant = []
    m_flag = False
    columns = ['experiment_id', 'question_id', 'percentage_correct', 'answer_id', 'answer_incorrect', 'programming_experience', 'hpc_experience', 'written', 'comments']

    for response in responses:

        for q_iter, q in enumerate(responses[response]['incorrect_answers']):

            for i in range(0, NUMANSWERS):

                    respondant = []
                    respondant.append(response)
                    respondant.append(q['question'])
                    respondant.append(responses[response]['percent_correct'][q_iter])
                    respondant.append('A' + str(i+1))

                    for m in q['missed']:
                        if (int(m.replace('A', '')) == i+1) and (not m_flag):
                            m_flag = True
                    if m_flag:
                        respondant.append('True')
                    else:
                        respondant.append('False')


                    respondant.append(responses[response]['respondant']['programming_experience'])
                    if 'hpc_experience' in responses[response]['respondant']:
                        respondant.append(responses[response]['respondant']['hpc_experience'])
                    else:
                        respondant.append(None)
                    if 'written' in responses[response]['respondant']:
                        respondant.append(responses[response]['respondant']['written'])
                    else:
                        respondant.append(None)
                    if 'comments' in responses[response]['respondant']:
                        respondant.append(responses[response]['respondant']['comments'])
                    else:
                        respondant.append(None)

                    m_flag = False

                    allresponses.append(respondant)

    # make a dataframe and output csv
    df = pd.DataFrame(allresponses, columns=columns)

    with open(outpath, 'w') as f:
        f.write(df.to_csv());

    df['answer_incorrect'] = df['answer_incorrect'].map({'False':False, 'True':True})

    return df



def mapResponsesToHist(aggResponses):
    histograms = {}
    answersOrder = ['T1', 'T2', 'T3', 'M1', 'M2', 'M3', 'M4', 'M6', 'M7', 'M8', 'M9']

    #with the above object iterate over respondants and build up a histogram of
    # answer percenteges per question
    for count,respondant in enumerate(aggResponses):
        for i, answerPercentage in enumerate(aggResponses[respondant]['percent_correct']):
            if answersOrder[i] not in histograms:
                histograms[answersOrder[i]] = {}
            if answerPercentage not in histograms[answersOrder[i]]:
                histograms[answersOrder[i]][answerPercentage] = 0
            histograms[answersOrder[i]][answerPercentage] += 1

    return histograms


def getListFromHist(questionHist, bins):

    counts = [None] * len(bins)

    for i, category in enumerate(bins):
        if category in questionHist:
            counts[i] = questionHist[category]
        else:
            counts[i] = 0

    return counts


def filterRespondants(respondants, filter):
    filterRespondants = {}
    for respondant in respondants:
        if filter in respondants[respondant]['respondant']['programming_experience']:
            filterRespondants[respondant] = respondants[respondant]

    return filterRespondants


'''
Produce the histogram visual itself
'''
def makeHistogram(bins, counts, question):

        source = ColumnDataSource(data=dict(bins=bins, counts=counts))

        # code adapated from (https://bokeh.pydata.org/en/latest/docs/user_guide/categorical.html)
        plt = figure(x_range=bins, plot_height=500, title="Answer Percentage Breakdown for Question {}".format(question),
           toolbar_location=None, tools="hover", tooltips="Frequency: @counts")
        plt.vbar(x='bins', top='counts', width=0.9, source=source)
        plt.xgrid.grid_line_color = None
        plt.y_range.start = 0

        return plt



def outputStackedChart(histograms, outpath, filters):
        p = None
        rowPlts = []
        QPlts = []
        bins = [0.0, 0.25, 0.5, 0.75, 1.0]
        binsStr = []
        counts = []
        levelOrganizedData = {}
        data = {'bins':[]}


        for q in histograms[0]:
            if q not in levelOrganizedData:
                levelOrganizedData[q] = {}

            for lvndx, level in enumerate(histograms):

                for bin in level[q]:
                    if bin not in bins:
                        bins.append(bin)
                bins.sort()

                binsStr = [None] * len(bins)
                for i, bin in enumerate(bins):
                    binsStr[i] = str(bin*100) + '%'


                if filters[lvndx] not in levelOrganizedData[q]:
                    levelOrganizedData[q][filters[lvndx]] = []

                levelOrganizedData[q][filters[lvndx]] = getListFromHist(level[q], bins)

            levelOrganizedData[q]['bins'] = binsStr

        # visualize with bokeh
        output_file(outpath)

        colors = ["#c9d9d3", "#718dbf", "#e84d60", '#444444']
        # print(levelOrganizedData)
        for iter, question in enumerate(levelOrganizedData):

            if iter % 2 == 0:
                rowPlts = []

            plt = figure(x_range=binsStr, plot_height=500, title="Response rates for question {} divided by programming expertise".format(question),
           toolbar_location=None, tools="hover", tooltips="$name: @$name")

            plt.vbar_stack(filters, x='bins', width=0.9, color=colors, source=levelOrganizedData[question],
             legend=[value(x) for x in filters])

            plt.y_range.start = 0
            plt.x_range.range_padding = 0.1
            plt.xgrid.grid_line_color = None
            plt.axis.minor_tick_line_color = None
            plt.outline_line_color = None
            plt.legend.location = "top_left"
            plt.legend.orientation = "vertical"

            rowPlts.append(plt)

            if iter % 2 == 1 or iter+1 == len(levelOrganizedData):
                QPlts.append(rowPlts)

        sbc = gridplot(QPlts)

        if showFlag:
            show(sbc)



def printHistograms(histograms, outpath):
        p = None
        rowPlts = []
        QPlts = []

        bins = [0.0, 0.25, 0.5, 0.75, 1.0]
        binsStr = []
        counts = []

        #and visualize
        # preprocess visualization
        for iter, question in enumerate(histograms):
            if iter % 2 == 0:
                rowPlts = []

            for bin in histograms[question]:
                if bin not in bins:
                    bins.append(bin)
            bins.sort()

            binsStr = [None] * len(bins)
            for i, bin in enumerate(bins):
                binsStr[i] = str(bin*100) + '%'

            counts = getListFromHist(histograms[question], bins)

            # visualize with bokeh
            output_file(outpath)

            plt = makeHistogram(binsStr, counts, question)

            rowPlts.append(plt)

            if iter % 2 == 1 or iter+1 == len(histograms):
                QPlts.append(rowPlts)


        p = gridplot(QPlts)

        if showFlag:
            show(p)


def main():
    #data structure(s) to store aggregate data
    histograms = {}
    aggResponses = {}
    filters = ['beginner', 'intermediate', 'advanced', 'none']
    id = None
    count = 0

    if fqflag is True:
        outpath = 'processed_fqs/'
    elif mqflag is True:
        outpath = 'processed_mqs/'

    #requires windows slashes on windows
    #from each repondant I want
    for dir in dirs:
        for filepath in glob.glob(dir + '*.stats.json'):
            #to store thier information in an object oraganized by thier id which we can iterate over
            id = filepath.strip(dir).strip('.stats.json')

            with open(filepath) as f:
                aggResponses[id] = json.loads(f.read())

            count += 1

    stats_df = makeAggResponseCSV(aggResponses, outpath+'stats.csv');


    # get answer incorrect by q and a
    incorrect_counts = stats_df.loc[stats_df['answer_incorrect'] == True].groupby(['question_id', 'answer_id']).count()['answer_incorrect']

    print(incorrect_counts)

    incorrect_counts_by_expertise = stats_df.loc[stats_df['answer_incorrect'] == True].groupby(['question_id', 'answer_id', 'programming_experience']).count()

    print(incorrect_counts_by_expertise)

    icbe_pivot = incorrect_counts_by_expertise.pivot_table('answer_incorrect', ['question_id', 'answer_id'], 'programming_experience')


    with open(outpath+'expertise_incorrect_counts_pivot.csv', 'w') as f:
        f.write(icbe_pivot.to_csv())

    # with open(outpath+'expertise_incorrect_counts.csv', 'w') as f:
    #     f.write(incorrect_counts_by_expertise.to_csv(header='answer_incorrect'))
    # with open(outpath+'incorrect_counts_by_qa.csv', 'w') as f:
    #     f.write(incorrect_counts.to_csv(header='answer_incorrect'))



    # get filtered histograms by expertise
    beginner = filterRespondants(aggResponses, filters[0])
    intermediate = filterRespondants(aggResponses, filters[1])
    advanced = filterRespondants(aggResponses, filters[2])
    noexp = filterRespondants(aggResponses, filters[3])


    histograms = mapResponsesToHist(aggResponses)
    n_hist = mapResponsesToHist(noexp)
    b_hist = mapResponsesToHist(beginner)
    i_hist = mapResponsesToHist(intermediate)
    a_hist = mapResponsesToHist(advanced)


    printHistograms(histograms, outpath + "answer_percentage_hists.html")

    outputStackedChart([b_hist, i_hist, a_hist, n_hist], outpath + "answer_percentage_stacked.html", filters)
    # show(p)


    pass


if __name__ == "__main__":
    main()
