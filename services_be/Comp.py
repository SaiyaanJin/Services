from exchangelib import Credentials, Account, Configuration, DELEGATE, Message, HTMLBody
import os
from pymongo import MongoClient, errors
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import json
from flask_cors import CORS
from werkzeug .utils import secure_filename
import shutil
import requests

app = Flask(__name__)

CORS(app)

UPLOAD_FOLDER = './'

ALLOWED_EXTENSIONS = {'txt',
                      'pdf', 'png', 'jpg',
                      'jpeg',
                      'gif'}


def ComplaintCollection():

    # CONNECTION_STRING = "mongodb://forecast_user:forecast@10.3.101.90:27017/?authSource=admin"
    CONNECTION_STRING = "mongodb://mongodb0.erldc.in:27017,mongodb1.erldc.in:27017,mongodb10.erldc.in:27017/?replicaSet=CONSERV"
    client = MongoClient(CONNECTION_STRING)
    db = client['Complaints']
    User_Input_Table = db['User_Input']
    return User_Input_Table


User_Input_Table = ComplaintCollection()
# /////////////////////////////////////////////////////////MAIL////////////////////////////////


def service_mail(data_list):

    credentials = Credentials('nldc\\erldcnotifications', 'Tfpsdmp@2023')
    config = Configuration(
        server='mail.grid-india.in', credentials=credentials)
    account = Account(primary_smtp_address='erldcnotifications@grid-india.in', config=config,
                      autodiscover=False, access_type=DELEGATE)

    if data_list[0] == "New Service Request":

        dept = [
            ["Human Resource : Human Resource"],
            ["Contract Services : Contract Services"],
            ["Finance : Finance & Accounts"],
            ["Cyber Security : Cyber Security"],
            ["System Operation : Post Despatch",
             "System Operation : Real Time Operation",
             "System Operation : Operational Planning"],
            ["Market Operation : Open Access",
             "Market Operation : Market Coordination",
             "Market Operation : Interface Energy Metering, Accounting & Settlement",
             "Market Operation : Regulatory Affairs, Market Operation planning & Coordination"],
            ["Logistics : TS"],
            ["Logistics : IT"],
            ["Logistics : Communication"],
            ["Logistics : OT (Decision Support)"]]

        email_address_list = [["erldchr.gr@grid-india.in", "varshabyahut@grid-india.in", ["rosysinha@grid-india.in"]],
                              ["erldc.cs@grid-india.in", ["sukumar@grid-india.in"]],
                              ["mdas@grid-india.in", "jatan@grid-india.in",
                                  "sumit.prasad@grid-india.in", "diptikanta@grid-india.in", ["vivek.upadhyay@grid-india.in"]],
                              ["ciso-erldc@grid-india.in", ["gurmit@grid-india.in",
                                                            "paul.tapobrata@grid-india.in"]],
                              ["erldcso@grid-india.in", ["konar_s@grid-india.in",
                                                         "bilash.achari@grid-india.in", "manasdas@grid-india.in"]],
                              ["erldc.mo@grid-india.in",
                                  ["saurav.sahay@grid-india.in"]],
                              ["sujitnandi@grid-india.in",
                                  "avijitroy@grid-india.in", ["scde@grid-india.in", "mkmallick@grid-india.in"]],
                              ["erldcitgr@grid-india.in", ["gurmit@grid-india.in",
                                                           "paul.tapobrata@grid-india.in"]],
                              ["erldccommunication@grid-india.in",
                                  ["scde@grid-india.in", "lmuralikrishna@grid-india.in"]],
                              ["erldcscada@grid-india.in", ["scde@grid-india.in", "dbiswas@grid-india.in"]]]

        for index in range(len(dept)):
            if (data_list[1] in dept[index]):
                m = Message(
                    account=account,
                    subject=data_list[0]+": "+data_list[2],
                    body='',
                    to_recipients=email_address_list[index][:-1],
                    cc_recipients=email_address_list[index][-1])

                html_body = """
                            <html>
                                <body>
                                Sir/Madam,<br/>
                                    You have a <b>{}</b> from {} department, with subject- <b>{}</b>.<br/>
                                    Breif detail of the issue is- <b>{}</b><br/> 
                                    Kindly check the issue with Docket Number- <b>{}</b> at Service request portal <b><a href="https://sso.erldc.in:3000">sso login</a></b>.<br/>
                                    This issue is raised by {} of {} on {}.<br/><br/>

                                <h5>This is a system generated mail. Please do not reply to this mail.</h5><br/>
                                </body>
                            </html>
                """

                m.body = HTMLBody(html_body.format(
                    data_list[0], data_list[6], data_list[2], data_list[3], data_list[7], data_list[5], data_list[6], data_list[4]))
                m.send()

    # if data_list[0] == "Resolved":
    else:

        Docket_Number = data_list[1]
        Issue_resolved_by = data_list[2]

        resp = User_Input_Table.find({'Docket_Number': Docket_Number})
        resp_list = list(resp)

        Issue_resolved_by_dept = resp_list[0]['Department']
        Issue_subject = resp_list[0]['Subject']
        Issue_brief = resp_list[0]['Breif']
        Issue_logged_by = resp_list[0]['Data_Filled_by']

        Issue_logged_by_name = Issue_logged_by.split("(")[0][:-1]
        Issue_logged_by_id = Issue_logged_by.split("(")[1][:-1]
        Issue_logged_by_dept = resp_list[0]['User_Department']

        res = requests.get('https://sso.erldc.in:5000/emp_data',
                           headers={'Data': 'Sanju8@92'})
        response = json.loads(res.text)

        for item in response:
            if Issue_logged_by_name == item['Name'] and Issue_logged_by_id == item["Emp_id"]:
                Issuer_mail = item['Mail']

        m = Message(
            account=account,
            subject='Service Request: '+Issue_subject +
            ' (Docket No- '+str(Docket_Number) +
            ') has been marked: '+data_list[0],
            body='',
            to_recipients=[Issuer_mail])
        # cc_recipients=email_address_list[index][-1])

        html_body = """
                    <html>
                        <body>
                        Sir/Madam,<br/>
                            Your Service Request: <b>{}</b> (Docket No- <b>{}</b>) has been marked: <b>{}</b> by: <b>{}</b> Department.<br/>
                            Breif detail of the issue is- <b>{}</b><br/> 
                            Kindly log-in to Service request portal through <b><a href="https://sso.erldc.in:3000">sso login</a></b> and Aceept/Deny the Service Request Status.<br/>
                            

                        <h5>This is a system generated mail intended for Name- {}, Emp_id: {} of {} Department. Please do not reply to this mail.</h5><br/>
                        </body>
                    </html>
        """

        m.body = HTMLBody(html_body.format(
            Issue_subject, Docket_Number, data_list[0], Issue_resolved_by_dept, Issue_brief, Issue_logged_by_name, Issue_logged_by_id, Issue_logged_by_dept))
        m.send()

# /////////////////////////////////////////////////////////bashboard////////////////////////////////


@app.route('/Dashboard', methods=['GET', 'POST'])
def Dashboard():

    user_details = request.headers['Data']
    print(user_details)

    dept = [
        "Human Resource : Human Resource",
        "Contract Services : Contract Services",
        "Finance : Finance & Accounts",
        "Cyber Security : Cyber Security",
        "System Operation : Post Despatch",
        "System Operation : Real Time Operation",
        "System Operation : Operational Planning",
        "Market Operation : Open Access",
        "Market Operation : Market Coordination",
        "Market Operation : Interface Energy Metering, Accounting & Settlement",
        "Market Operation : Regulatory Affairs, Market Operation planning & Coordination",
        "Logistics : TS",
        "Logistics : IT",
        "Logistics : Communication",
        "Logistics : OT (Decision Support)",]

    department_data = []
    final_output = []

    for item in dept:

        try:

            response = User_Input_Table.find(
                filter={'Department': item}, projection={'_id': 0, 'Department': 1, 'Present_Status': 1})

            response = list(response)

            if (len(response) > 0):
                department_data.append(response)

        except:
            continue

    for item1 in department_data:

        resolved = 0

        for thing in item1:
            if thing["Present_Status"] != "New Service Request" and thing["Present_Status"] != "Under Progress":
                resolved += 1

        temp_dict = {
            "Total": len(item1),
            "Resolved": resolved,
            "Pending": len(item1) - resolved,
            "Department": item1[0]["Department"]}

        final_output.append(temp_dict)

    final_output = sorted(
        final_output, key=lambda x: x["Total"], reverse=True)

    return jsonify(final_output)

# /////////////////////////////////////////////////////Attachment File Upload & Download////////////


@app.route('/upload', methods=['GET', 'POST'])
def upload():

    file = request.files.getlist("demo[]")

    filepath = ""
    if file:
        for item in file:
            name = item.filename
            name = name.replace(" ", "_")
            name = name.replace(")", "")
            name = name.replace("(", "")
            filepath = filepath+name

        filepath = 'E:/Applications/Services/services_be/instance/htmlfi/'+filepath
        for item in file:
            os.makedirs(os.path.join(
                app.instance_path, filepath), exist_ok=True)
            item.save(os.path.join(app.instance_path, filepath,
                      secure_filename(item.filename)))
    return ("Done")


@app.route('/download', methods=['GET', 'POST'])
def download():

    File_list = request.args['path']
    File_Name = request.args['File_Name']

    File_list = File_list.split(',')

    all_files = []
    filepath = ""

    for file1 in File_list:
        file1 = file1.replace(" ", "_")
        file1 = file1.replace(")", "")
        file1 = file1.replace("(", "")
        filepath = filepath+file1

    folder_path = "E:/Applications/Services/services_be/instance/htmlfi/"+filepath

    dir_list = os.listdir(folder_path)

    for file in File_list:
        file = file.replace(" ", "_")
        file = file.replace(")", "")
        file = file.replace("(", "")
        file = file.replace("&", "")

        if file in dir_list:

            file_path = folder_path+file
            all_files.append(file_path)

        else:
            return jsonify(file+" has been removed")

    # with ZipFile('E:/test/Service Portal/services_be/instance/file.zip', 'w') as zip_object:
    #     for items in all_files:
    #         zip_object.write(items)

    archived = shutil.make_archive(
        "E:/Applications/Services/services_be/instance/ZipFiles/testzip", 'zip', folder_path)

    return send_file('E:/Applications/Services/services_be/instance/ZipFiles/testzip.zip', as_attachment=True, download_name=File_Name+".zip")

# ///////////////////////////////////////////////////////////////////////////////////////////////////////////


@app.route('/DataInsert', methods=['GET', 'POST'])
def DataInsert():

    response = ["Data Inserted SuccessFully"]

    Input_array = request.headers['Data']
    Input_array = json.loads(Input_array)

    docket = User_Input_Table.find_one(sort=[("Docket_Number", -1)])

    Input_array["Docket_Number"] = int(docket["Docket_Number"])+1

    try:
        res = User_Input_Table.insert_one(Input_array)
        response.append(Input_array["Docket_Number"])

        service_mail(
            ["New Service Request",
             Input_array["Department"],
             Input_array["Subject"],
             Input_array["Breif"],
             Input_array["Input_Date"],
             Input_array["Data_Filled_by"],
             Input_array["User_Department"],
             Input_array["Docket_Number"]]
        )

    except errors.DuplicateKeyError as e:
        response = ["Duplicate Data"]
    return jsonify(response)


@app.route("/ExportData", methods=['GET', 'POST'])
def ExportData():

    Input_array = request.headers['Data']
    response = User_Input_Table.find(
        filter={'Data_Filled_by': Input_array}, projection={'_id': 0})

    response = list(response)

    for item in range(len(response)):
        if len(response[item]["File"]) == 0:

            response[item]["File"] = "No file was Uploaded"

        if (response[item]["Present_Status"] == "Resolved" and response[item]["Old_Status"] == "Resolved"):
            response[item]["Ticket_Closed"] = True

        else:
            response[item]["Ticket_Closed"] = False

    data_to_send = []

    for items in response:
        if items not in data_to_send:
            data_to_send.append(items)

    data_to_send = sorted(
        data_to_send, key=lambda x: x["Docket_Number"], reverse=True)

    def get_index(element):
        return sort_order.index(element['Present_Status'])

    sort_order = ["New Service Request", "Under Progress",
                  "Can not be Resolved", "Working (No Action Required)", "Resolved"]

    data_to_send = sorted(data_to_send, key=get_index)

    return jsonify(response)


@app.route("/ExportDataAlluser", methods=['GET', 'POST'])
def ExportDataAlluser():

    Input_array = request.headers['Data']

    response = User_Input_Table.find(
        filter={'User_Department': Input_array}, projection={'_id': 0})

    response = list(response)

    for item in range(len(response)):
        if len(response[item]["File"]) == 0:

            response[item]["File"] = "No file was Uploaded"

        if (response[item]["Present_Status"] == "Resolved" and response[item]["Old_Status"] == "Resolved"):
            response[item]["Ticket_Closed"] = True

        else:
            response[item]["Ticket_Closed"] = False

    data_to_send = []

    for items in response:
        if items not in data_to_send:
            data_to_send.append(items)

    data_to_send = sorted(
        data_to_send, key=lambda x: x["Docket_Number"], reverse=True)

    def get_index(element):
        return sort_order.index(element['Present_Status'])

    sort_order = ["New Service Request", "Under Progress",
                  "Can not be Resolved", "Working (No Action Required)", "Resolved"]

    data_to_send = sorted(data_to_send, key=get_index)

    return jsonify(response)


@app.route("/ExportDataAdmin", methods=['GET', 'POST'])
def ExportDataAdmin():

    Input_array = request.headers['Data']
    response = User_Input_Table.find(
        filter={}, projection={'_id': 0})

    response = list(response)

    for item in range(len(response)):
        if len(response[item]["File"]) == 0:

            response[item]["File"] = "No file was Uploaded"

        if (response[item]["Present_Status"] == "Resolved" and response[item]["Old_Status"] == "Resolved"):
            response[item]["Ticket_Closed"] = True

        else:
            response[item]["Ticket_Closed"] = False

    data_to_send = []

    for items in response:
        if items not in data_to_send:
            data_to_send.append(items)

    data_to_send = sorted(
        data_to_send, key=lambda x: x["Docket_Number"], reverse=True)

    def get_index(element):
        return sort_order.index(element['Present_Status'])

    sort_order = ["New Service Request", "Under Progress",
                  "Can not be Resolved", "Working (No Action Required)", "Resolved"]

    data_to_send = sorted(data_to_send, key=get_index)

    return jsonify(data_to_send)


@app.route("/ExportDataDepartment", methods=['GET', 'POST'])
def ExportDataDepartment():
    try:
        Input_array = request.headers['Data']
    except:
        Input_array = ''
    

    if Input_array == "Information Technology":
        Input_array = ["Logistics : IT", "Cyber Security: Cyber Security"]

    if Input_array == "Contracts & Services":
        Input_array = ["Contract Services: Contract services"]

    if Input_array == "Human Resource":
        Input_array = ["Human Resource: Human Resource"]

    if Input_array == "Finance & Accounts":
        Input_array = ["Finance: Finance & Accounts"]

    if Input_array == "Communication":
        Input_array = ["Logistics : Communication"]

    if Input_array == "SCADA":
        Input_array = ["Logistics : OT (Decision Support)"]

    if Input_array == "Technical Services":
        Input_array = ["Logistics : TS"]

    if Input_array == "Market Operation":
        Input_array = ["Market Operation : Market Coordination",
                       "Market Operation : Open Access",
                       "Market Operation : Regulatory Affairs",
                       "Market Operation : planning & Coordination",
                       "Market Operation : Interface Energy Metering",
                       "Market Operation : Accounting & Settlement",]

    if Input_array == "System Operation":
        Input_array = ["System Operation : Operational Planning",
                       "System Operation : Real Time Operation",
                       "System Operation : Post Despatch",]

    final_list = []

    for item in Input_array:
        response = User_Input_Table.find(
            filter={'Department': item}, projection={'_id': 0})
        response = list(response)
        # print(response,item)
        final_list = final_list + response

    for item in final_list:
        if len(item["File"]) == 0:
            item["File"] = "No file was Uploaded"

    data_to_send = []

    for items in final_list:
        if items not in data_to_send:
            data_to_send.append(items)

    data_to_send = sorted(
        data_to_send, key=lambda x: x["Docket_Number"], reverse=True)

    def get_index(element):
        return sort_order.index(element['Present_Status'])

    sort_order = ["New Service Request", "Under Progress",
                  "Can not be Resolved", "Working (No Action Required)", "Resolved"]

    data_to_send = sorted(data_to_send, key=get_index)

    return jsonify(data_to_send)


@app.route("/ExportDataDepartmentAdmin", methods=['GET', 'POST'])
def ExportDataDepartmentAdmin():

    Input_array = request.headers['Data']

    if Input_array == "Information Technology":
        Input_array = ["Logistics : IT", "Cyber Security: Cyber Security"]

    if Input_array == "Contracts & Services":
        Input_array = ["Contract Services: Contract services"]

    if Input_array == "Human Resource":
        Input_array = ["Human Resource: Human Resource"]

    if Input_array == "Finance & Accounts":
        Input_array = ["Finance: Finance & Accounts"]

    if Input_array == "Communication":
        Input_array = ["Logistics : Communication"]

    if Input_array == "SCADA":
        Input_array = ["Logistics : OT (Decision Support)"]

    if Input_array == "Technical Services":
        Input_array = ["Logistics : TS"]

    if Input_array == "Market Operation":
        Input_array = ["Market Operation: Market_Coordination",
                       "Market Operation: Open Access",
                       "Market Operation: Regulatory Affairs",
                       "Market Operation: planning & Coordination",
                       "Market Operation: Interface Energy Metering",
                       "Market Operation: Accounting & Settlement",]

    if Input_array == "System Operation":
        Input_array = ["System Operation : Operational Planning",
                       "System Operation : Real Time Operation",
                       "System Operation : Post Despatch",]

    final_list = []

    for item in Input_array:
        response = User_Input_Table.find(
            filter={}, projection={'_id': 0})
        response = list(response)
        final_list = final_list + response

    for item in final_list:
        if len(item["File"]) == 0:
            item["File"] = "No file was Uploaded"

    data_to_send = []

    for items in final_list:
        if items not in data_to_send:
            data_to_send.append(items)

    data_to_send = sorted(
        data_to_send, key=lambda x: x["Docket_Number"], reverse=True)

    def get_index(element):
        return sort_order.index(element['Present_Status'])

    sort_order = ["New Service Request", "Under Progress",
                  "Can not be Resolved", "Working (No Action Required)", "Resolved"]

    data_to_send = sorted(data_to_send, key=get_index)

    return jsonify(data_to_send)


@app.route('/UserInputupdate', methods=['GET', 'POST'])
def UserInputupdate():

    datas = request.headers['datas']
    datas = json.loads(datas)

    try:
        datas[0].pop("Old_Status")
        datas[0].pop("Present_Status")

        User_Input_Table.update_one(
            {"Docket_Number": datas[0]["Docket_Number"]}, {"$set": datas[0]})

        reply = "Success"

    except:
        reply = "Error"

    return jsonify(reply)


@app.route('/UserBreifupdate', methods=['GET', 'POST'])
def UserBreifupdate():

    datas = request.headers['datas']
    datas = json.loads(datas)

    try:

        User_Input_Table.update_one(
            {"Docket_Number": datas[0]["Docket_Number"]}, {"$set": datas[0]})

        reply = "Success"

    except:
        reply = "Error"

    return jsonify(reply)


@app.route('/UserInputStatusupdate', methods=['GET', 'POST'])
def UserInputStatusupdate():

    datas = request.headers['datas']
    datas = json.loads(datas)

    try:
        reply = "Success"

        User_Input_Table.update_one(
            {"Docket_Number": datas[0]["Docket_Number"]}, {"$set": datas[0]})

        if datas[0]['Present_Status'] == 'Resolved':
            data_list = ["Resolved", datas[0]['Docket_Number'],
                         datas[0]['Data_Edited_by'].split('.')[1][1:-2]]

        if datas[0]['Present_Status'] == 'Under Progress':
            data_list = ["Under Progress", datas[0]['Docket_Number'],
                         datas[0]['Data_Edited_by'].split('.')[1][1:-2]]

        if datas[0]['Present_Status'] == 'Working (No Action Required)':
            data_list = ["Working (No Action Required)", datas[0]['Docket_Number'],
                         datas[0]['Data_Edited_by'].split('.')[1][1:-2]]

        if datas[0]['Present_Status'] == 'Can not be Resolved':
            data_list = ["Can not be Resolved", datas[0]['Docket_Number'],
                         datas[0]['Data_Edited_by'].split('.')[1][1:-2]]

        try:
            service_mail(data_list)

        except:
            reply = "Mail Send Issue"

    except:
        reply = "Error"

    return jsonify(reply)


if __name__ == '__main__':

    app.run(debug=True, host='0.0.0.0', port=5050)
