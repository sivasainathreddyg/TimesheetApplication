const cds = require("@sap/cds");

module.exports = srv => {
    // srv.on("RetriveEmployeeDetails", async req => {
    //     try {
    //         const employees = await cds.transaction(req).run(
    //             SELECT.from("TIMESHEETAPPLICATION_EMPLOYEEDETAILS")
    //         );

    //         if (employees.length > 0) {
    //             return JSON.stringify(employees); // Convert data to JSON string
    //         } else {
    //             return JSON.stringify([]); // Return an empty JSON array as a string
    //         }
    //     } catch (error) {
    //         console.error("Error retrieving employees:", error);
    //         return JSON.stringify({ error: "Failed to retrieve employees" });
    //     }
    // });

    srv.on("RetriveEmployeeDetails", async req => {
        try {
            const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

            const employees = await cds.transaction(req).run(
                SELECT.from("TIMESHEETAPPLICATION_EMPLOYEEDETAILS")
                    .where(`ENDDATE IS NULL OR ENDDATE >=`, today) // Include employees with no ENDDATE or future ENDDATE
            );

            return JSON.stringify(employees.length > 0 ? employees : []); // Return filtered employees
        } catch (error) {
            console.error("Error retrieving employees:", error);
            return JSON.stringify({ error: "Failed to retrieve employees" });
        }
    });
    srv.on("CheckingEmployeeEnddate", async req => {
        try {
            // const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
            const today=req.data.selecteddate;

            const employees = await cds.transaction(req).run(
                SELECT.from("TIMESHEETAPPLICATION_EMPLOYEEDETAILS")
                    .where(`ENDDATE IS NULL OR ENDDATE >=`, today) // Include employees with no ENDDATE or future ENDDATE
            );

            return JSON.stringify(employees.length > 0 ? employees : []); // Return filtered employees
        } catch (error) {
            console.error("Error retrieving employees:", error);
            return JSON.stringify({ error: "Failed to retrieve employees" });
        }
    });
    // srv.on("Createnewemployee", async req => {
    //     try {
    //         // const newEmployeedata = JSON.parse(req.data.newemployeedata);
    //         let newEmployeedata = JSON.parse(req.data.newemployeedata); 

    //         if (newEmployeedata) {
    //             await cds.transaction(req).run(
    //                 INSERT.into("TIMESHEETAPPLICATION_EMPLOYEEDETAILS").entries(newEmployeedata)

    //             );
    //             return { message: "Employee(s) created successfully" };
    //         }
    //     } catch (error) {
    //         console.error("Error create employees:", error);
    //         return { error: "Failed to create employees" };

    //     }
    // })
    srv.on("Createnewemployee", async req => {
        try {
            if (!req.data || !req.data.newemployeedata) {
                return { error: "Missing employee data" };
            }

            let newEmployeedata;
            try {
                newEmployeedata = JSON.parse(req.data.newemployeedata); // ✅ Parse it
            } catch (error) {
                return { error: "Invalid employee data format" };
            }

            if (typeof newEmployeedata !== "object") {
                return { error: "Employee data should be an object" };
            }

            await cds.transaction(req).run(
                INSERT.into("TIMESHEETAPPLICATION_EMPLOYEEDETAILS").entries(newEmployeedata)
            );

            return { message: "Employee created successfully" };
        } catch (error) {
            console.error("Error creating employees:", error);
            return { error: "Failed to create employees" };
        }
    });
    // srv.on("Updateemployee", async req => {
    //     let updateemployeedata;
    //     try {
    //         updateemployeedata = JSON.parse(req.data.updateemployeedata);
    //     } catch (error) {
    //         return { error: "Invalid Update data" }
    //     }
    //     var Empname = updateemployeedata.NAME;
    //     const employeedata = await cds.transaction(req).run(
    //         SELECT.one.from("TIMESHEETAPPLICATION_EMPLOYEEDETAILS").where({ NAME: Empname })
    //     );
    //     if (employeedata) {
    //         await cds.update("TIMESHEETAPPLICATION_EMPLOYEEDETAILS").set(updateemployeedata).where({ NAME: Empname })
    //     }else{
    //         return req.error(404, `Employee with Name ${updateemployeedata.NAME} not found.`);
    //     }
    // })

    srv.on("Updateemployee", async req => {
        let updateemployeedata;

        try {
            updateemployeedata = JSON.parse(req.data.updateemployeedata);
        } catch (error) {
            return req.error(400, "Invalid update data format.");
        }

        const Empname = updateemployeedata.Name; // Ensure correct case matching with CDS entity

        if (!Empname) {
            return req.error(400, "Employee Name is required.");
        }

        // Check if the employee exists
        const existingEmployee = await cds.transaction(req).run(
            SELECT.one.from("TIMESHEETAPPLICATION_EMPLOYEEDETAILS").where({ NAME: Empname })
        );

        if (!existingEmployee) {
            return req.error(404, `Employee with Name ${Empname} not found.`);
        }

        // Perform update
        const updatedRows = await cds.transaction(req).run(
            UPDATE("TIMESHEETAPPLICATION_EMPLOYEEDETAILS")
                .set({
                    CLIENT: updateemployeedata.client,
                    PROJECT: updateemployeedata.project,
                    CLIENTID: updateemployeedata.clientId,
                    STARTDATE: updateemployeedata.StartDate,
                    ENDDATE: updateemployeedata.EndDate || null
                })
                .where({ NAME: Empname })
        );

        if (updatedRows === 0) {
            return req.error(500, "Failed to update employee details.");
        }

        return { message: `Employee ${Empname} updated successfully.` };
    });

    // srv.on("SaveTimesheetData",async req=>{
    //     try {
    //         if (!req.data || !req.data.Timesheetdata) {
    //             return { error: "Missing employee data" };
    //         }

    //         let Leavedata;
    //         try {
    //             Leavedata = JSON.parse(req.data.Timesheetdata); // ✅ Parse it
    //         } catch (error) {
    //             return { error: "Invalid employee data format" };
    //         }

    //         if (typeof Leavedata !== "object") {
    //             return { error: "Employee data should be an object" };
    //         }

    //         await cds.transaction(req).run(
    //             INSERT.into("TIMESHEETAPPLICATION_TIMESHEETDATA").entries(Leavedata)
    //         );

    //         return { message: "Timesheet Saved successfully" };
    //     } catch (error) {
    //         console.error("Error on saved Timeshhet:", error);
    //         return { error: "Failed to saved Timesheet" };
    //     }

    // })
    srv.on("SaveTimesheetData", async (req) => {
        try {
            if (!req.data || !req.data.Timesheetdata) {
                return { error: "Missing employee data" };
            }

            let Leavedata;
            try {
                Leavedata = JSON.parse(req.data.Timesheetdata);
            } catch (error) {
                return { error: "Invalid employee data format" };
            }

            if (!Array.isArray(Leavedata)) {
                return { error: "Employee leave data should be an array" };
            }

            const db = cds.transaction(req);
            let messages = [];

            for (let leaveEntry of Leavedata) {
                const { Name, Year, Month, LeaveDays, ClientHolidays } = leaveEntry;

                if (!Name || !Year || !Month || LeaveDays === undefined || ClientHolidays === undefined) {
                    messages.push(`Invalid data for ${Name || "unknown"}, skipping...`);
                    continue;
                }

                // Convert strings to clean arrays
                let newLeaveDays = LeaveDays.split(",").map(day => day.trim()).filter(Boolean);
                let newClientHolidays = ClientHolidays.split(",").map(day => day.trim()).filter(Boolean);

                // Check for existing record
                let existing = await db.run(
                    SELECT.from("TIMESHEETAPPLICATION_TIMESHEETDATA")
                        .where({ Name, Year, Month })
                );

                if (existing.length > 0) {
                    let record = existing[0];

                    let existingLeaveDays = record.LEAVEDAYS?.split(",").map(day => day.trim()).filter(Boolean) || [];
                    let existingClientHolidays = record.CLIENTHOLIDAYS?.split(",").map(day => day.trim()).filter(Boolean) || [];

                    // Compare LeaveDays
                    let updatedLeaveDays = [...new Set(newLeaveDays)];
                    let leaveChanged = updatedLeaveDays.sort().join(",") !== existingLeaveDays.sort().join(",");

                    // Compare ClientHolidays
                    let updatedClientHolidays = [...new Set(newClientHolidays)];
                    let clientHolidayChanged = updatedClientHolidays.sort().join(",") !== existingClientHolidays.sort().join(",");

                    if (leaveChanged || clientHolidayChanged) {
                        await db.run(
                            UPDATE("TIMESHEETAPPLICATION_TIMESHEETDATA")
                                .set({
                                    LEAVEDAYS: updatedLeaveDays.join(","),
                                    CLIENTHOLIDAYS: updatedClientHolidays.join(",")
                                })
                                .where({ Name, Year, Month })
                        );

                        messages.push(`Updated timesheet for ${Name}`);
                    } else {
                        messages.push(" No changed Timesheetdata saved successfully");
                    }
                } else {
                    // Insert new leave entry if no previous record exists
                    await db.run(
                        INSERT.into("TIMESHEETAPPLICATION_TIMESHEETDATA").entries(leaveEntry)
                    );

                    messages.push("Timesheetdata saved successfully");
                }
            }

            return { message: messages.join("\n") };
        } catch (error) {
            console.error("Error saving timesheet:", error);
            return { error: "Failed to save timesheet" };
        }
    });


    srv.on("GetEmployeeLeave", async req => {
        try {
            // Validate request data
            if (!req.data || !req.data.EmployeeLeaves) {
                return { error: "Missing employee data" };
            }

            let Leavesdata;
            try {
                Leavesdata = JSON.parse(req.data.EmployeeLeaves); // ✅ Safely parse input
            } catch (error) {
                return { error: "Invalid employee data format" };
            }

            const year = Leavesdata.Year;
            const month = Leavesdata.Month;

            // Fetch leave data from the database
            const leaveRecords = await cds.transaction(req).run(
                SELECT.from("TIMESHEETAPPLICATION_TIMESHEETDATA")
                    .where({ YEAR: year, MONTH: month })
            );

            if (!leaveRecords.length) {
                return { message: "No leave records found for the given year and month." };
            }

            return { data: leaveRecords }; // ✅ Return fetched leave data
        } catch (error) {
            console.error("Error getting leaves data:", error);
            return { error: "Failed to get leave data" };
        }
    });


};
