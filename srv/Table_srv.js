const cds = require("@sap/cds");

module.exports = srv => {
    srv.on("RetriveEmployeeDetails", async req => {
        try {
            const employees = await cds.transaction(req).run(
                SELECT.from("TIMESHEETAPPLICATION_EMPLOYEEDETAILS")
            );

            if (employees.length > 0) {
                return JSON.stringify(employees); // Convert data to JSON string
            } else {
                return JSON.stringify([]); // Return an empty JSON array as a string
            }
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
    
        const Empname = updateemployeedata.Name ; // Ensure correct case matching with CDS entity
    
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
                    CLIENT: updateemployeedata.client ,
                    PROJECT: updateemployeedata.project,
                    CLIENTID: updateemployeedata.clientId,
                    STARTDATE: updateemployeedata.StartDate,
                    ENDDATE: updateemployeedata.EndDate  || null
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
                Leavedata = JSON.parse(req.data.Timesheetdata); // ✅ Parse the incoming JSON data
            } catch (error) {
                return { error: "Invalid employee data format" };
            }
    
            if (!Array.isArray(Leavedata)) {
                return { error: "Employee leave data should be an array" };
            }
    
            const db = cds.transaction(req);
            let messages = [];
    
            for (let leaveEntry of Leavedata) {
                const { Name , Year , Month , LeaveDays  } = leaveEntry;
                if (!Name || !Year || !Month || !LeaveDays) {
                    messages.push(`Invalid data for ${Name}, skipping...`);
                    continue;
                }
    
                // Convert leave days string to array
                let newLeaveDays = LeaveDays.split(",").map(day => day.trim()).filter(day => day);
                
                // Fetch existing leave records for the same user and period
                let existingEntry = await db.run(
                    SELECT.from("TIMESHEETAPPLICATION_TIMESHEETDATA")
                        .where({ Name, Year, Month })
                );
    
                if (existingEntry.length > 0) {
                    let existingLeaveDays = existingEntry[0].LEAVEDAYS .split(",").map(day => day.trim()).filter(day => day);
                    
                    // Determine added and removed leave days
                    let addedLeaves = newLeaveDays.filter(day => !existingLeaveDays.includes(day));
                    let removedLeaves = existingLeaveDays.filter(day => !newLeaveDays.includes(day));
    
                    if (addedLeaves.length > 0 || removedLeaves.length > 0) {
                        let updatedLeaveDays = [...new Set([...existingLeaveDays, ...addedLeaves])].filter(day => !removedLeaves.includes(day));
                        
                        await db.run(
                            UPDATE("TIMESHEETAPPLICATION_TIMESHEETDATA")
                                .set({ LEAVEDAYS: updatedLeaveDays.join(",") })
                                .where({ Name, Year, Month })
                        );
    
                        messages.push("Timesheetdata saved successfully");
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
