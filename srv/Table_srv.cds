using TimesheetApplication from '../db/Table';

service CatalogService {
    entity TimesheetData   as projection on TimesheetApplication.TimesheetData;
    entity EmployeeDetails as projection on TimesheetApplication.EmployeeDetails;
    function RetriveEmployeeDetails()                       returns String;
    function Createnewemployee(newemployeedata : String)    returns String;
    function Updateemployee(updateemployeedata : String)    returns String;
    function SaveTimesheetData(Timesheetdata : String)      returns String;
    function GetEmployeeLeave(EmployeeLeaves : String)      returns String;
    function CheckingEmployeeEnddate(selecteddate : String) returns String;

}
