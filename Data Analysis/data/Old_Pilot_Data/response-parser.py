'''
A parser which takes in user responses and outputs them in .csv format for easy
analysis.
'''

import glob
import json
import sys
import pandas as pd

fqflag = False
mqflag = True #default is old question set
dir = '.'

#setargs as global variables
# bad practice I know but not crucial variables can be thought of
# as global constants
for i, arg in enumerate(sys.argv):
    if arg == '-d':
        dir = sys.argv[i+1]
    if arg == '-mq':
        mqflag = True
        fqflag = False
    if arg == '-fq':
        fqflag = True
        mqflag = False


def getIncorrectLocations(evaledAnswers):
    responseRows = []
    colNames = evaledAnswers.columns

    for row in evaledAnswers.iterrows():
        response = {'question':'', 'missed':[]}

        for i, col in enumerate(row[1]):
            if i == 0:
                response['question'] = col
            else:
                if col == 0:
                    response['missed'].append(colNames[i])
                pass

        responseRows.append(response)

    return responseRows


def calcStats(evaluatedAnswers):
    answerStats = {}

    incorrect_answers = getIncorrectLocations(evaluatedAnswers)

    df = evaluatedAnswers.drop(columns=['QN'])
    percent_correct = df.agg('mean', axis=1).to_list()

    answerStats['percent_correct'] = percent_correct
    answerStats['incorrect_answers'] = incorrect_answers

    return answerStats


'''
    Function organizes reponses so that they are in the order of questions as declared in the multi-questions or full-questions json files.
'''
def organizeResponses(responses):
    for response in responses:
        alignedResponses = [None] * 4
        for ndx, box in enumerate(response['boxes']):
            alignedResponses[response['answer_order'][ndx]] = box
        response['aligned_responses'] = alignedResponses
    pass



def loadAndCompareAns(filepath):
    answerKey = None
    answers = None
    gradedAnswers = None

    if mqflag:
        answerKey = pd.read_csv('multi-questions-key.csv')
    elif fqflag:
        answerKey = pd.read_csv('full-questions-key.csv')

    answers = pd.read_csv(filepath)
    gradedAnswers = pd.DataFrame().reindex_like(answers)

    for col in answerKey:
        if 'QN' in col:
            for row in range(0, len(answerKey[col])):
                gradedAnswers[col][row] = answerKey[col][row]
        else:
            for row in range(0, len(answerKey[col])):
                if (( 'Y' in answerKey[col][row] and answers[col][row] == True) or
                    ('N' in answerKey[col][row] and answers[col][row] == False)):
                    gradedAnswers[col][row] = 1
                elif 'M' in answerKey[col][row]:
                    gradedAnswers[col][row] = 1
                else:
                    gradedAnswers[col][row] = 0

    return gradedAnswers

def parse(filepath):
    isRespondantData = True;
    respondantData = {}
    responses = []
    resp = {}


    with open(filepath) as f:
        for line in f:
            if line.find("exper") != -1:
                keyval = line.split(':')
                respondantData["programming_experience"] =  keyval[1].strip()

            elif line.find("hpc") != -1:
                keyval = line.split(':')
                respondantData["hpc_experience"] =  keyval[1].strip()

            elif line.find("written") != -1:
                keyval = line.split(':')
                respondantData["written"] =  keyval[1].strip()

            elif line.find("analyzed") != -1:
                keyval = line.split(':')
                respondantData["hpc_experience"] =  keyval[1].strip()

            elif line.find("boxes") != -1:
                keyval = line.split(':')
                keyval[1] = keyval[1].replace('\'', '').strip()
                resp["boxes"] = json.loads(keyval[1])

            elif line.find("question") != -1:
                if line.find("question_num") != -1:
                    continue
                else:
                    keyval = line.split(':')
                    resp["question"] =  keyval[1].strip()

            elif line.find("answer_order") != -1:
                keyval = line.split(':')
                keyval[1] = keyval[1].replace('\'', '').strip()
                resp["answer_order"] = json.loads(keyval[1])

            elif(line.find('comment') != -1):
                keyval = line.split(':')
                if keyval[1] is not None:
                    respondantData["comments"] =  keyval[1].strip()

            elif (line.find("--") != -1) or (line.find("End study") != -1):
                if isRespondantData:
                    isRespondantData = False
                else:
                    responses.append(resp)
                    resp = {}
            else:
                continue

        # sort by question number
        responses = sorted(responses, key = lambda i: i['question'])
        organizeResponses(responses)


        #output json
        respJSON = {'responses': responses, 'respondant': respondantData}

        return respJSON


def main():
    evaledAnswers = None;

    for filepath in glob.glob(dir + '*.txt'):

        # parse the file and return relevant info
        respJSON = parse(filepath)

        # write out retieved infor to a json for easy retireval and manipulation
        with open(filepath.replace('.txt', '.json'), 'w') as f:
            f.write(json.dumps(respJSON))


        #output .csv
        #consider changing trues and false to 'Y' and 'N'

        with open(filepath.replace('.txt', '.csv'), 'w') as f:
            f.write('QN,A1,A2,A3,A4\n')
            for r in respJSON['responses']:
                row = r['question'] + ','
                for i, ar in enumerate(r['aligned_responses']):
                    if (i is not (len(r['aligned_responses']) - 1)):
                        row += '{},'.format(str(ar))
                    else:
                        row += '{}'.format(str(ar))
                f.write(row)
                f.write('\n')

        '''
        Doing some prelimenary/processing/evaluation per file while we have data in
        memory.
        '''
        evaledAnswers = loadAndCompareAns(filepath.replace('.txt', '.csv'))
        answerStats = calcStats(evaledAnswers)

        # add respondant data to stats
        answerStats['respondant'] = respJSON['respondant']

        #output answer evaluation matrix
        with open(filepath.replace('.txt', '.evaluated.csv'), 'w') as f:
            f.write(evaledAnswers.to_csv(index=False))

        #output answer stats
        with open(filepath.replace('.txt', '.stats.json'), 'w') as f:
            f.write(json.dumps(answerStats))

main()
