/**
 *  This file contains all the api endpoints which will interacts with the database of the seroboard and 
 *  perform all the crud operations and give the obtained data to the front end
 * 
 */


/* -------------------------------------   All imports ----------------------------------------------  */

import express from 'express'
import mysql from 'mysql'
import cors from "cors"




/* -------------------------------------  MySQL database connection ---------------------------------- */




var app = express()
app.use(cors())
app.use(express.json())


//  CORS error 

app.get('/cors', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.send({ "msg": "This has CORS enabled 🎈" })
})

// const response = await fetch('http://localhost:3005/cors', { mode: 'cors' });

var mysqlConnection = mysql.createConnection({
    host: "database-1.cfq4riwekent.ap-south-1.rds.amazonaws.com",
    port: "3306",
    user: "admin",
    password: "zqHcUnr6JzgqYPkEEyjz",
    database: "seroboard",
    multipleStatements: true
})

mysqlConnection.connect(err => {
    if (!err)
        console.log("database connection successfull");
    else
        console.log(err);
})
const port =process.env.PORT||3005
app.listen(port)




/* ------------------------------------------ Authentication ---------------------------------------- */

app.post("/login", (req, res) => {
    // console.log(req)
    const user = req.body
    mysqlConnection.query(`SELECT sp_email FROM seroboard.s_people where sp_email="${user.email}"`,
        (err, rows) => {
            if (rows.length > 0) {
                var finalRow = convertValues(rows)
                if (err) {
                    console.log("hello" + err)
                    res.send('Authentication Unsuccessfull')
                }
                else
                    finalRow;

                if (finalRow === user.email)
                    mysqlConnection.query(`SELECT sp_username as UserName, sp_roles as Role FROM seroboard.s_people where sp_email="${user.email}"`,
                        (err, rows) => res.send(rows))
                else
                    res.send('Authentication Unsuccessfull')
            }
            else
                res.send('Authentication Unsuccessfull')
        })
})


const convertValues = values => {
    var database_email;
    var final_email;
    var actual_email;
    database_email = Object.values(JSON.parse(JSON.stringify(values)));
    final_email = Object.values(database_email[0]);
    actual_email = final_email[0];
    return actual_email;
}




/* ------------------------------------- admin duties on users ------------------------------- */

// get the list of all users along with the roles
app.get('/getUsers', (req, res) => {
    mysqlConnection.query('SELECT sp_id as id, sp_email as Email, sp_username as UserName, sp_roles as Role FROM seroboard.s_people', (err, rows) => {
        if (err) {
            console.log(err)
            res.send("Unable to get the users")
        }
        else
            res.send(rows)
    })
})


// insert a new user into the table
app.post('/insertUser', (req, res) => {
    const user = req.body
    var sql = "SET @email = ?; SET @username = ?; SET @role = ?; CALL insertUsers(@email,@username,@role)"
    let i
    for (i = 0; i < user.length; i++) {
        mysqlConnection.query(sql, [user[i].email, user[i].username, user[i].role], err => {
            if (err) {
                console.log(err)
                res.status(400).json({
                    status: {
                        success: false,
                        code: 400,
                        message: "unauthorized"
                    },
                    data: "unable to get the users"
                })
            }
        })
    }
    res.status(200).json({
        status: {
            success: true,
            code: 200,
            message: "authorised"
        }, data: "inserted rows " + i
    })
})

// Get user by Id
app.get('/getUsers/:id', (req, res) => {
    const id = req.params.id
    mysqlConnection.query(`SELECT sp_id as ID, sp_email as Email, sp_username as UserName, sp_roles as Role FROM seroboard.s_people where sp_id = ${id}`, (err, rows) => {
        if (err) {
            console.log(err)
            res.send("Unable to get the users")
        }
        else {
            res.status(200).json({
                status: {
                    success: true,
                    code: 200,
                    message: "authorised"
                }, data: { rows }
            })
        }
    })
})
// update the existing user
app.patch('/updateUser', (req, res) => {
    const user = req.body
    console.log("The body", user);
    mysqlConnection.query(`UPDATE seroboard.s_people SET sp_roles ="${user.role}", sp_email = "${user.email}", sp_username = "${user.username}" where sp_id = ${user.id}; 
    UPDATE seroboard.s_personal_details SET spd_role = "${user.role}", spd_email_id = "${user.email}" 
    WHERE spd_sp_id = ${user.id}`, err => {
        if (err) {
            console.log(err)
            res.status(400).json({
                status: {
                    success: false,
                    code: 400,
                    message: "unauthorized"
                },
                data: "unable to update the user"
            })
        }
        else {
            res.status(200).json({
                status: {
                    success: true,
                    code: 200,
                    message: "authorised"
                },
                data: "user updated successfully"
            })
        }
    })
})



//delete the existing user
app.delete('/deleteUser/:id', (req, res) => {
    const id = req.params.id
    mysqlConnection.query(`DELETE FROM seroboard.s_personal_details WHERE spd_sp_id = ${id};DELETE FROM seroboard.s_people WHERE sp_id = ${id}`, err => {
        if (err) {
            console.log(err)
            res.status(400).json({
                status: {
                    success: false,
                    code: 400,
                    message: "unauthorized"
                },
                data: "unable to delete the user"
            })
        }
        else {
            res.status(200).json({
                status: {
                    success: true,
                    code: 200,
                    message: "authorised"
                }, data: "user deleted successfully"
            })
        }
    })
})




/* --------------------------------- admin duties on batches -------------------------------------- */

// create a batch
app.post('/insertBatch', (req, res) => {
    const batch = req.body
    mysqlConnection.query(`INSERT INTO seroboard.s_admin_batch (sad_batch_id, sad_batch_name, sad_batch_start_date, sad_batch_end_date, sad_sp_id_inst,sad_sp_id_coor, sad_batch_course,sad_total_weeks) VALUES ('${batch.batch_id}', '${batch.batch_name}', '${batch.start_date}', '${batch.end_date}', (SELECT sp_id FROM seroboard.s_people where sp_username="${batch.instructor_name}" and sp_roles = "instructor"), (SELECT sp_id FROM seroboard.s_people where sp_username="${batch.coordinator_name}" and sp_roles="co-ordinator"), '${batch.course}', '${batch.total_weeks}')`, err => {
        if (err) {
            console.log(err)
            res.send("unable to create a batch")
        }
        else
            res.send("Batch created Successfully")
    })
})


//Get the details of all the batches

app.get('/getBatches', (req, res) => {
    mysqlConnection.query(`select sad.sad_batch_id as BatchId, sad.sad_batch_name as BatchName,DATE_FORMAT(sad.sad_batch_start_date, '%Y-%m-%d') as StartDate, DATE_FORMAT(sad.sad_batch_end_date,'%Y-%m-%d') as EndDate,s1.sp_email as InstructorEmail, s1.sp_username as Instructor,s2.sp_email as CoordinatorEmail,s2.sp_username as Coordinator,sad.sad_batch_course as Course, sad.sad_total_weeks as Duration from seroboard.s_admin_batch sad, seroboard.s_people s1,seroboard.s_people s2 where sad.sad_sp_id_inst = s1.sp_id and sad.sad_sp_id_coor = s2.sp_id;`,
        (err, row) => {
            if (err) {
                console.log(err)
                res.send("unable to fetch the batches")
            }
            else
                res.send({ "batches": row })
        })
})

//Get the details of all the batches of Co-ordinator

app.get('/getBatchesCor/:id', (req, res) => {
    const id = req.params.id
    mysqlConnection.query(`select sad.sad_batch_id as BatchId, sad.sad_batch_name as BatchName, 
    sad.sad_batch_start_date as StartDate, sad.sad_batch_end_date as EndDate, 
    s1.sp_email as InstructorEmail,s2.sp_email as CoordinatorEmail, 
    sad.sad_batch_course as Course, sad.sad_total_weeks as Duration from 
    seroboard.s_admin_batch sad, seroboard.s_people s1,seroboard.s_people s2 where 
    sad.sad_sp_id_inst = s1.sp_id and sad.sad_sp_id_coor = s2.sp_id and sad.sad_sp_id_coor=${id}`,
        (err, row) => {
            if (err) {
                console.log(err)
                res.send("unable to fetch the batches")
            }
            else
                res.send({ "batches": row })
        })
})

//Get the details of all the batches of Instructor

app.get('/getBatchesIns/:id', (req, res) => {
    const id = req.params.id
    mysqlConnection.query(`select sad.sad_batch_id as BatchId, sad.sad_batch_name as BatchName, 
    sad.sad_batch_start_date as StartDate, sad.sad_batch_end_date as EndDate, 
    s1.sp_email as InstructorEmail,s2.sp_email as CoordinatorEmail, 
    sad.sad_batch_course as Course, sad.sad_total_weeks as Duration from 
    seroboard.s_admin_batch sad, seroboard.s_people s1,seroboard.s_people s2 where 
    sad.sad_sp_id_inst = s1.sp_id and sad.sad_sp_id_coor = s2.sp_id and sad.sad_sp_id_inst=${id}`,
        (err, row) => {
            if (err) {
                console.log(err)
                res.send("unable to fetch the batches")
            }
            else
                res.send({ "batches": row })
        })
})

// Get Batch By Id

app.get('/getBatch/:id', (req,res)=>{
    const id = req.params.id
    mysqlConnection.query(`SELECT ss_id as ID, ss_employee_id as EmployeeId, ss_email_id as EmailId, ss_name as Name, ss_work_location as Location, ss_phone_number as PhoneNumber, ss_designation as Designation FROM seroboard.s_students WHERE ss_sad_batch_id = ${id};SELECT s1.sp_id as InstructorId, s1.sp_username as InstructorName, s2.sp_id as CoordinatorId, s2.sp_username as CoordinatorName, sab.sad_batch_id as BatchId, sab.sad_batch_name as BatchName, DATE_FORMAT(sab.sad_batch_start_date, '%Y-%m-%d') as BatchStartDate, DATE_FORMAT(sab.sad_batch_end_date,'%Y-%m-%d') as BatchEndDate, sab.sad_batch_course as Course, sab.sad_total_weeks as Duration FROM seroboard.s_people s1, seroboard.s_people s2, seroboard.s_admin_batch sab where sab.sad_batch_id = ${id} and sab.sad_sp_id_inst = s1.sp_id and sab.sad_sp_id_coor = s2.sp_id `, (err,rows)=>{
        if(err)
            {
                console.log(err)
                res.send("unable to get student details")
            }
        else
        {
            res.status(200).json({
                 status: {
                       success: true,
                        code: 200,
                        message: "authorised"
            }, data: { rows }
        })
       }
})})




//delete the batch
app.delete('/deleteBatch/:id', (req, res) => {
    const id = req.params.id
    mysqlConnection.query(`DELETE FROM seroboard.s_admin_batch WHERE sad_batch_id="${id}"`, err => {
        if (err) {
            console.log(err)
            res.status(400).json({
                status: {
                    success: false,
                    code: 400,
                    message: "unauthorized"
                },
                data: "Unable to delete the Batch"
            })
        }
        else {
            res.status(200).json({
                status: {
                    success: true,
                    code: 200,
                    message: "authorised"
                }, data: "batch deleted succesfully"
            })
        }
    })
})

//update the batch details
app.patch('/updateBatch', (req, res) => {
    const batch = req.body
    mysqlConnection.query(`UPDATE seroboard.s_admin_batch SET sad_batch_start_date ="${batch.start_date}", sad_batch_end_date="${batch.end_date}", sad_sp_id_inst= (SELECT sp_id FROM seroboard.s_people where sp_username = "${batch.instructor_username}" and sp_roles = "instructor"), sad_sp_id_coor= (SELECT sp_id FROM seroboard.s_people where sp_username = "${batch.coordinator_username}" and sp_roles = "co-ordinator"),sad_batch_course = "${batch.course}",sad_total_weeks = ${batch.duration} where sad_batch_id = ${batch.batch_id}`, err => {
        if (err) {
            console.log(err)
            res.status(400).json({
                status: {
                    success: false,
                    code: 400,
                    message: "unauthorized"
                },
                data: "unable to update the Batch"
            })
        }
        else {
            res.status(200).json({
                status: {
                    success: true,
                    code: 200,
                    message: "authorised"
                }, data: "Batch updated succesfully"
            })
        }
    })
})


/* ------------------------------------ Personal Details ------------------------------------- */

//to update the personal details
app.patch('/updatePersonalDetails', (req, res) => {
    const personal = req.body
    mysqlConnection.query(`UPDATE seroboard.s_personal_details SET spd_employee_id = "${personal.employee_id}", spd_first_name="${personal.first_name}", spd_last_name = "${personal.last_name}", spd_phone_number="${personal.phone_number}", spd_work_location = "${personal.work_location}", spd_designation="${personal.designation}" WHERE spd_email_id= "${personal.email}" AND spd_role="${personal.role}"`, err => {
        if (err) {
            console.log(err)
            res.send("unable to update the personal details")
        }
        else
            res.send("personal details updated successfully")
    })
})


//to get the personal details
app.get('/getPersonalDetails', (req, res) => {
    const personal = req.body
    mysqlConnection.query(`SELECT spd_first_name as FirstName, spd_last_name as LastName, spd_employee_id as EmployeeId, spd_email_id as EmailId, spd_role as Role, spd_phone_number as PhoneNumber, spd_work_location as WorkLocation, spd_designation as Designation FROM seroboard.s_personal_details WHERE spd_email_id = "${personal.email}" AND spd_role = "${personal.role}"`, (err, rows) => {
        if (err) {
            console.log(err)
            res.send("unable to send the personal details")
        }
        else
            res.send(rows)
    })
})




/* ---------------------------------- Co-ordinator duties on students --------------------------------------- */

//to add the details of the students
app.post('/insertStudent', (req, res) => {
    const students = req.body
    mysqlConnection.query(`INSERT INTO seroboard.s_students (ss_sad_batch_id, ss_employee_id, ss_email_id, ss_name, ss_work_location, ss_phone_number, ss_designation) VALUES ((SELECT sad_batch_id FROM seroboard.s_admin_batch WHERE sad_batch_id = ${students.batch_id}), "${students.employee_id}", "${students.email_id}", "${students.name}","${students.work_location}","${students.phone_number}","${students.designation}")`, err => {
        if (err) {
            console.log(err)
            res.send("unable to add student details")
        }
        else
            res.send("Student Added Successfully")
    })
})


//to get all the students
app.get('/getStudents', (req, res) => {
    const students = req.body
    mysqlConnection.query(`SELECT ss_employee_id as EmployeeId, ss_email_id as EmailId, ss_name as Name, ss_work_location as Location, ss_phone_number as PhoneNumber, ss_designation as Designation FROM seroboard.s_students WHERE ss_sad_batch_id = ${students.batch_id}`, (err, rows) => {
        if (err) {
            console.log(err)
            res.send("unable to get student details")
        }
        else
            res.send(rows)
    })
})


//to update a student detail
app.patch('/updateStudent', (req, res) => {
    const students = req.body
    mysqlConnection.query(`UPDATE seroboard.s_students SET ss_name="${students.name}", ss_work_location="${students.work_location}", ss_phone_number = "${students.phone_number}", ss_designation="${students.designation}" WHERE ss_id = ${students.id}`, err => {
        if (err) {
            console.log(err)
            res.status(400).json({
                status: {
                    success: false,
                    code: 400,
                    message: "unauthorized"
                },
                data: "unable to update the student"
            })
        }
        else {
            res.status(200).json({
                status: {
                    success: true,
                    code: 200,
                    message: "authorised"
                }, data: "Student details updated succesfully"
            })
        }
    })
})


//to delete a student
app.delete('/deleteStudent/:id', (req, res) => {
    const id = req.params.id
    mysqlConnection.query(`DELETE FROM seroboard.s_students WHERE ss_id = ${id}`, err => {
        if (err) {
            console.log(err)
            res.status(400).json({
                status: {
                    success: false,
                    code: 400,
                    message: "unauthorized"
                },
                data: "unable to delete the student"
            })
        }
        else {
            res.status(200).json({
                status: {
                    success: true,
                    code: 200,
                    message: "authorised"
                }, data: "Student deleted succesfully"
            })
        }
    })
})
/* --------------------------------------------- co-ordinator duties on student attendance ------------------------------- */

//to insert the attendance of students for a particular batch
app.post('/insertAttendance', (req, res) => {
    var attendance = req.body
    var sql = "SET @batch_id = ?; SET @employee_id = ?; SET @attendance_date = ?; SET @present = ?; CALL insertAttendanceOfBatch(@batch_id,@employee_id,@attendance_date,@present)"
    let i
    for (i = 0; i < attendance.length; i++) {
        mysqlConnection.query(sql, [(attendance[i].batch_id), (attendance[i].employee_id), (attendance[i].attendance_date), (attendance[i].present)], err => {
            if (err) {
                console.log(err)
                res.send("unable to insert attendance")
            }
        })
    }
    res.send("Inserted attendance records are : " + i)
})




//to get the attendance of the students in a particular batch between certain dates
app.post('/getAttendanceOnDate', (req, res) => {
    var attendance = req.body
    mysqlConnection.query(`SELECT ss.ss_employee_id as EmployeeId, ss.ss_name as Name, ss.ss_email_id as Email, ss.ss_sad_batch_id as BatchId, sa.sa_present as Attendance, sa.sa_date as Date FROM seroboard.s_attendance sa,seroboard.s_students ss WHERE sa.sa_ss_id = ss.ss_id AND sa.sa_sad_batch_id = ${attendance.batch_id} AND sa.sa_date = "${attendance.attendance_date}}"`, (err, row) => {
        if (err) {
            console.log(err)
            res.send("unable to get the attendance")
        }
        else
            res.send(row)
    })
})


//to get the attendance of a batch throughout the whole course
app.get('/getAttendanceOfBatch', (req, res) => {
    var attendance = req.body
    mysqlConnection.query(`SELECT ss.ss_employee_id as EmployeeId, ss.ss_name as Name, ss.ss_email_id as Email, ss.ss_sad_batch_id as BatchId, sa.sa_present as Attendance, sa.sa_date as Date FROM seroboard.s_attendance sa,seroboard.s_students ss WHERE sa.sa_ss_id = ss.ss_id AND sa.sa_sad_batch_id = ${attendance.batch_id}`, (err, row) => {
        if (err) {
            console.log(err)
            res.send("unable to get the attendance")
        }
        else
            res.send(row)
    })
})




/* -------------------------------------------- instructor duties on student marks --------------------------------------- */

//to insert the scores of students
app.post('/insertMarks', (req, res) => {
    var marks = req.body
    var sql = "SET @batch_id = ?; SET @employee_id = ?; SET @test_name = ?; SET @exam_date = ?; SET @marks = ?; CALL insertScoresOfStudents(@batch_id,@employee_id,@test_name,@exam_date,@marks)"
    let i
    for (i = 0; i < marks.length; i++) {
        mysqlConnection.query(sql, [marks[i].batch_id, marks[i].employee_id, marks[i].test_name, marks[i].exam_date, marks[i].marks], err => {
            if (err) {
                console.log(err)
                res.send("unable to insert score of students")
            }
        })
    }
    res.send("Inserted attendance records are : " + i)
})

//to give the marks of all students of a particular batch based on the exam
app.get('/getMarksByExam', (req, res) => {
    const marks = req.body
    mysqlConnection.query(`SELECT sab.sad_batch_name as BatchName, ss.ss_name as Name, stt.stt_test_name as ExamName, sm.sm_exam_date as ExamDate, sm.sm_marks as Marks FROM seroboard.s_marks sm, seroboard.s_admin_batch sab, seroboard.s_students ss, seroboard.s_test_type stt WHERE sm.sm_sad_batch_id = sab.sad_batch_id AND sm.sm_stt_test_id = stt.stt_test_id AND sm.sm_ss_id = ss.ss_id AND ss.ss_sad_batch_id = sab.sad_batch_id AND sm.sm_sad_batch_id = ${marks.batch_id} AND stt.stt_test_name = "${marks.test_name}";`, (err, row) => {
        if (err) {
            console.log(err)
            res.send("unable to fetch the marks")
        }
        else
            res.send(row)
    })
})


//to update the marks of a particular student based on the exam name
app.patch("/updateScores", (req, res) => {
    const marks = req.body;
    mysqlConnection.query(
        `UPDATE seroboard.s_marks SET sm_marks ="${marks.marks}" WHERE sm_ss_id=(SELECT ss_id FROM seroboard.s_students WHERE ss_employee_id="${marks.employee_id}" AND ss_sad_batch_id = ${marks.batch_id}) and sm_stt_test_id = (SELECT stt_test_id FROM seroboard.s_test_type where stt_test_name="${marks.test_name}" )`,
        (err) => {
            if (err) {
                console.log(err);
                res.send("unable to update the batch");
            }
            else
                res.send("score updated successfully");
        })
})

// Get student by Id
app.get('/getStudent/:id', (req, res) => {
    const id = req.params.id
    mysqlConnection.query(`SELECT ss_id as ID, ss_employee_id as EmployeeId, ss_email_id as EmailId, ss_name as Name, ss_work_location as Location, ss_phone_number as PhoneNumber, ss_designation as Designation FROM seroboard.s_students WHERE ss_id = ${id}`, (err, rows) => {
        if (err) {
            console.log(err)
            res.status(400).json({
                status: {
                    success: false,
                    code: 400,
                    message: "unauthorized"
                },
                data: "unable to get the student detailsS"
            })
        }
        else {
            res.status(200).json({
                status: {
                    success: true,
                    code: 200,
                    message: "authorised"
                }, data: { rows }
            })
        }
    })
})



/* ------------------------------------------------------------- Statistics of Admin ---------------------------------------------- */


//to get the count of individual users
app.get('/getUserCount', (req, res) => {
    mysqlConnection.query(`SELECT 
    COUNT(*) as "totalUsers",
    COUNT(CASE WHEN sp_roles = "admin" then 1 ELSE NULL END) as "admins",
    COUNT(CASE WHEN sp_roles = "instructor" then 1 ELSE NULL END) as "instructors",
    COUNT(CASE WHEN sp_roles = "co-ordinator" then 1 ELSE NULL END) as "coordinators"
from seroboard.s_people`, (err, row) => {
        if (err) {
            console.log(err)
            res.send("unable to fetch the count of users")
        }
        else
            res.send(row)
    })
})

//to get the total number of students in L&D based on Attendance
app.get('/getPresentAttendance', (req, res) => {
    mysqlConnection.query(`SELECT COUNT(*) AS PresentStudents FROM seroboard.s_attendance WHERE sa_present = "P" AND sa_date = "2022-03-20"; SELECT COUNT(DISTINCT ss_employee_id) AS TotalStudents FROM seroboard.s_students`, (err, row) => {
        if (err) {
            console.log(err)
            res.send("unable to get the total students and present students")
        }
        else
            res.send(row)
    })
})

// To get Total Number of Participants
app.get('/totalPart', (req, res) => {
    mysqlConnection.query(`SELECT COUNT(DISTINCT ss_employee_id) AS totalParticipants FROM seroboard.s_students`, (err, row) => {
        if (err) {
            console.log(err)
            res.send("unable to get the total students")
        }
        else
            res.send(row)
    })
})

// Students per course
app.get('/getStudentsPerCourse', (req, res) => {
    mysqlConnection.query(`SELECT sab.sad_batch_name as BatchName, count(ss.ss_id) as TotalStudents FROM seroboard.s_admin_batch sab, seroboard.s_students ss WHERE sab.sad_batch_id = ss_sad_batch_id group by sab.sad_batch_id;`, (err, row) => {
        if (err) {
            console.log(err)
            res.status(400).json({
                status: {
                    success: false,
                    code: 400,
                    message: "unauthorized"
                },
                data: "unable to get the count of users"
            })
        }
        else {
            res.status(200).json({
                status: {
                    success: true,
                    code: 200,
                    message: "authorised"
                }, data: { row }
            })
        }
    })
})

//to dispaly the total duration of each individual course


