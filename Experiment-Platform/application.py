from flask import Flask
app = Flask(__name__)

from flask import render_template
from flask import request
import json
import time
import datetime
import os

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

cred = credentials.Certificate("pattern-study-firebase-adminsdk-cc042-eee71a4b9d.json")
firebase_admin.initialize_app(cred)
db = firestore.client()
docs = db.collection(u'main_study_pickups')


@app.route("/end", methods=['POST'])
def endStudy():
    filename = request.form['session']
    curr_time = str(datetime.datetime.now())

    doc = docs.document(filename)

    curr_dict = doc.get().to_dict()

    curr_dict['bio']['end_multi'] = curr_time

    doc.update(curr_dict)

    return json.dumps({'status': 'OK'})


@app.route("/comments/<session>")
def comments(session):
    return render_template('comments.html', session = session)

# @app.route("/comments")
# def comments():
#     session = 1
#     return render_template('comments.html', session = session)

@app.route("/processComments", methods=['POST'])
def processComments():
    filename = request.form['session']
    
    doc = docs.document(filename)

    curr_bio = doc.get().to_dict()['bio']
    
    curr_time = str(datetime.datetime.now())
    curr_bio['end_study'] = curr_time
    
    for k, v in request.form.items():
        print(k, v)
        curr_bio[k] = v

    doc.update({"bio":curr_bio})

    return thankyou()

@app.route("/thankyou")
def thankyou():
    return render_template('thankyou.html')


@app.route("/demographics")
def demographics():
    prolific_id = request.args.get('PROLIFIC_PID')

    # csp = crowd_source_platform
    return render_template('demographics.html', csp_id = prolific_id)

@app.route("/paper_proto")
def paper_proto(filename = "default.txt"):
    return render_template('drawing-template.html', session = filename)

@app.route("/tutorial")
def tutorial(filename=None):
    if filename == None:
        filename = request.args.get('filename')

    return render_template('tutorial.html', session = filename)

@app.route("/tutorialQuestions", methods=['POST'])
def tutorialQuestions():
    filename = request.form['session']
    savefile = open(filename+".txt", 'a')
    print(filename)
    return render_template('tutorial-multi.html', session=filename)

@app.route("/questions", methods=['POST'])
def questions():
    filename = request.form['session']
    savefile = open(filename+".txt", 'a')
    return render_template('multi.html', session=filename)

@app.route("/saveDemo", methods=['POST'])
def saveDemo():
    filename = str(time.time())

    doc = docs.document(filename)

    new_obj = { 'bio' : { 'answered': 0, 'version': '1.01' }, 'responses':[] }
    curr_time = str(datetime.datetime.now())
    new_obj['bio']['first_save'] = curr_time
    
    for k, v in request.form.items():
        print(k, v)
        new_obj['bio'][k] = v

    doc.set(new_obj)    

    return tutorial(filename)

@app.route("/grid")
def grid():
    return render_template('grid.html')

@app.route("/recordGrid", methods=['POST'])
def recordGrid():
    for k, v in request.form.items():
        print('k:', k, 'v:', v)
    return json.dumps({'status': 'OK'})

@app.route("/recordResponse", methods=['POST'])
def recordMulti():
    filename = request.form['session']

    doc = docs.document(filename)

    curr_bio = doc.get().to_dict()['bio']
    curr_bio['answered'] = int(curr_bio['answered']) + 1
    doc.update({"bio":curr_bio})

    new_obj = {}
    for k, v in request.form.items():
        if k[-2:] == '[]':
            v = request.form.getlist(k)
            print('k:', k[:-2], 'v:', v)
            liststring = str(v).replace("[","")
            liststring = liststring.replace("]","")
            newlist = liststring.split(", ")
            templist = []
            for entry in newlist:
                templist.append(entry[1:].replace("'","").strip())
            new_obj[str(k[:-2])] = templist
        else:
            new_obj[k] = v
            print('k:', k, 'v:', v)

    doc.update({
    'responses': firestore.ArrayUnion([new_obj])
    })
    
    return json.dumps({'status': 'OK'})

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
    app._static_folder = './static/'
