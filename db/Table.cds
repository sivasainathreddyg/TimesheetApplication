namespace TimesheetApplication;

entity TimesheetData {
    key ID        : Integer @generated;
        Name      : String;
        Year      : Integer;
        Month     : String;
        LeaveDays : String;
        ClientHolidays:String;
}

entity EmployeeDetails {
    key Name      : String;
        client    : String;
        project   : String;
        clientId  : String;
        StartDate : Date;
        EndDate   : Date;
}
