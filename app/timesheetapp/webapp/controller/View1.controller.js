sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, Fragment) {
    "use strict";
    var that;

    return Controller.extend("timesheetapp.controller.View1", {
        onInit: function () {
            var that = this;
            var oData = {
                // employees: [
                //     { name: "Nageswara", client: "Karlstorz", project: "KS US Support", clientId: "NRALLA.EXT" },
                //     { name: "Raju Dasi", client: "Karlstorz", project: "KS US Support", clientId: "RDASI.EXT" },
                //     { name: "Pavan kumar Bassa", client: "Karlstorz", project: "KS US Support", clientId: "SAPAVNB.EXT" },
                //     { name: "Rakesh Gattu", client: "Karlstorz", project: "KS US Support", clientId: "RAGATTU.EXT" },
                //     { name: "Mohan pentakota", client: "Karlstorz", project: "KS US Support", clientId: "MOPENTAK.EXT" }
                // ],
                years: [
                    { year: "2025" }, { year: "2026" }, { year: "2027" }
                ],
                months: [
                    { month: "January" }, { month: "February" }, { month: "March" },
                    { month: "April" }, { month: "May" }, { month: "June" },
                    { month: "July" }, { month: "August" }, { month: "September" },
                    { month: "October" }, { month: "November" }, { month: "December" }
                ]
            };
            var oVizFrame = this.getView().byId("leaveChart");
            if (oVizFrame) {
                oVizFrame.setVizProperties({
                    title: {
                        visible: true,
                        text: "Employees Leaves" //  Set title of the chart
                    },
                    valueAxis: {
                        title: {
                            visible: true,
                            text: "Number of Leaves" //  Add Y-axis title
                        },
                        label: {
                            formatString: "L0" //  Ensure whole numbers are shown
                        },
                        scale: {
                            fixedRange: true, //  Prevents auto-scaling
                            minValue: 0,
                            maxValue: 5 //  Adjust based on max expected leaves
                        }
                    },
                    categoryAxis: {
                        title: {
                            visible: true,
                            text: "Employees" //  Add X-axis title
                        },
                        label: {
                            angle: 0, //  Ensures horizontal text (instead of vertical)
                            rotation: 0
                        }
                    },
                    plotArea: {
                        dataLabel: {
                            visible: true, //  Show values on bars
                            formatString: "L0" //  Whole numbers
                        },
                        colorPalette: d3.scale.category10().range(), //  Different colors for each bar
                        gap: {
                            barSpacing: 0.2 //  Adjust spacing between bars
                        },
                        gridline: {
                            visible: true //  Show grid lines for better readability
                        }
                    }
                });
            }

            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel);
            that.RetriveEmployeeDetails();
        },
        RetriveEmployeeDetails: function () {
            var OTable=this.getView().byId("employeeTable");
            OTable.setBusyIndicatorDelay(0);
            OTable.setBusy(true);
            var oModel = this.getOwnerComponent().getModel();
            var that = this;

            oModel.callFunction("/RetriveEmployeeDetails", {
                method: "GET",
                success: function (oData) {
                    try {
                        var parsedData = JSON.parse(oData.RetriveEmployeeDetails); // Parse the JSON string returned from the backend
                        var oEmployeeModel = new JSONModel(parsedData);
                        that.getView().setModel(oEmployeeModel, "EmployeeModel"); // Set model to the view
                        OTable.setBusy(false);
                    } catch (error) {
                        sap.m.MessageToast.show("Error parsing employee data.");
                        OTable.setBusy(false);
                    }
                },
                error: function (err) {
                    sap.m.MessageToast.show("Failed to retrieve employee details.");
                }
            });
        },
        onYearMonthChange: function () {
            var oView = this.getView();
            var sYear = oView.byId("yearComboBox").getSelectedKey();
            var sMonth = oView.byId("monthComboBox").getSelectedKey();
            if (!sYear || !sMonth) return;

            var oTable = oView.byId("timesheetTable");
            oTable.destroyColumns();
            oTable.destroyItems();


            // **Set table busy before loading data**
            oTable.setBusyIndicatorDelay(0); // Ensure immediate effect
            oTable.setBusy(true);

            // Enable scrollable table
            oTable.setFixedLayout(false);
            oTable.setWidth("auto");

            // Get number of days in selected month
            var iMonthIndex = new Date(Date.parse(sMonth + " 1, " + sYear)).getMonth();
            var iDaysInMonth = new Date(sYear, iMonthIndex + 1, 0).getDate();

            // **Invisible Employee Name Column**
            var oEmployeeColumn = new sap.m.Column({
                header: new sap.m.Text({ text: "Employee Name" }),
                visible: false // Hide in UI
            });
            oTable.addColumn(oEmployeeColumn);

            for (var i = 1; i <= iDaysInMonth; i++) {
                var oColumn = new sap.m.Column({
                    header: new sap.m.Text({ text: sMonth.substring(0, 3) + "-" + (i < 10 ? "0" + i : i) }),
                    width: "80px"
                });
                oTable.addColumn(oColumn);
            }

            oTable.addColumn(new sap.m.Column({
                header: new sap.m.Text({ text: "Total" }),
                width: "120px"
            }));

            var oEmployeeModel = oView.getModel("EmployeeModel");
            if (!oEmployeeModel) {
                sap.m.MessageToast.show("No Employee Data Available.");
                return;
            }

            var aEmployees = oEmployeeModel.getData();
            if (!Array.isArray(aEmployees)) {
                sap.m.MessageToast.show("Invalid Employee Data Format.");
                return;
            }
            var oPayload = {
                Year: sYear,
                Month: sMonth
            }

            // **Call Backend to Check for Existing Leave Data**
            var that = this;
            var oModel = this.getOwnerComponent().getModel();
            oModel.callFunction("/GetEmployeeLeave", {
                method: "GET",
                urlParameters: { EmployeeLeaves: JSON.stringify(oPayload) },
                success: function (oData) {
                    var aLeaveData = oData.GetEmployeeLeave.data; // Array of leave data objects
                    if (!oData.GetEmployeeLeave.message) {
                        aEmployees.forEach(function (oEmployee) {
                            var oRow = new sap.m.ColumnListItem();
                            var iTotalHours = 0;
                            var iLeaveCount = 0;

                            // **Set Employee Name**
                            oRow.addCell(new sap.m.Text({
                                text: oEmployee.NAME,
                                visible: false // Hide in UI
                            }));

                            // **Find Leave Data for Employee**
                            var oEmployeeLeave = aLeaveData.find(e => e.NAME === oEmployee.NAME);
                            var aLeaveDays = oEmployeeLeave ? oEmployeeLeave.LEAVEDAYS.split(",") : []; // Get leave days as array

                            for (var i = 1; i <= iDaysInMonth; i++) {
                                var oDate = new Date(sYear, iMonthIndex, i);
                                var sDay = oDate.toLocaleDateString("en-US", { weekday: "short" });

                                var oCell;
                                if (sDay === "Sat" || sDay === "Sun") {
                                    oCell = new sap.m.Input({ value: "", editable: false, width: "60px" }); // Non-editable for weekends
                                } else {
                                    var sDayStr = i < 10 ? "0" + i : i.toString(); // Format as two-digit string

                                    // **Set "L" for leave days, "8" otherwise**
                                    var sValue = aLeaveDays.includes(sDayStr) ? "L" : "8";

                                    // Count leave days
                                    if (sValue === "L") {
                                        iLeaveCount++;
                                    }

                                    oCell = new sap.m.Input({
                                        value: sValue,
                                        editable: true,
                                        width: "60px",
                                        change: function (oEvent) {
                                            that.onCellValueChange(oEvent);
                                        }
                                    });

                                    iTotalHours += sValue === "L" ? 0 : 8; // Add 8 only for non-leave days
                                }

                                oRow.addCell(oCell);
                            }

                            // **Set Total Hours**
                            oRow.addCell(new sap.m.Input({
                                value: iTotalHours.toString(),
                                width: "70px"
                            }));

                            // **Update Employee Leave Count for Chart**
                            oEmployee.leaveCount = iLeaveCount;

                            oTable.addItem(oRow);
                        });
                        oTable.setBusy(false);
                        that.getView().byId("Timesheetsaveid").setEnabled(true)
                        oEmployeeModel.refresh(true);
                        that.updateChart();

                    } else {
                        aEmployees.forEach(function (oEmployee) {
                            var oRow = new sap.m.ColumnListItem();
                            var iTotalHours = 0;
                            // var iLeaveCount = 0;

                            // **Set Employee Name**
                            oRow.addCell(new sap.m.Text({
                                text: oEmployee.NAME,
                                visible: false // Hide in UI
                            }));

                            // **Find Leave Data for Employee**
                            // var oEmployeeLeave = aLeaveData.find(e => e.NAME === oEmployee.NAME);
                            // var aLeaveDays = oEmployeeLeave ? oEmployeeLeave.LEAVEDAYS.split(",") : []; // Get leave days as array

                            for (var i = 1; i <= iDaysInMonth; i++) {
                                var oDate = new Date(sYear, iMonthIndex, i);
                                var sDay = oDate.toLocaleDateString("en-US", { weekday: "short" });

                                var oCell;
                                if (sDay === "Sat" || sDay === "Sun") {
                                    oCell = new sap.m.Input({ value: "", editable: false, width: "60px" }); // Non-editable for weekends
                                } else {
                                    oCell = new sap.m.Input({
                                        value: "8",
                                        editable: true,
                                        width: "60px",
                                        change: function (oEvent) {
                                            that.onCellValueChange(oEvent);
                                        }
                                    });

                                    iTotalHours += 8;
                                }

                                oRow.addCell(oCell);
                            }

                            // **Set Total Hours**
                            oRow.addCell(new sap.m.Input({
                                value: iTotalHours.toString(),
                                width: "70px"
                            }));

                            oTable.addItem(oRow);
                        });
                        aEmployees.forEach(function (oEmp) {
                            oEmp.leaveCount = 0;
                        });
                        oTable.setBusy(false);
                        that.getView().byId("Timesheetsaveid").setEnabled(true)
                        oEmployeeModel.refresh(true);
                        that.updateChart();


                    }

                },
                error: function () {
                    sap.m.MessageToast.show("Failed to retrieve timesheet data from backend.");
                }
            });
        },
        onCellValueChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var oRow = oInput.getParent(); // Get the row
            var iTotal = 0;
            var iLeaveCount = 0;

            oRow.getCells().forEach(function (oCell, index, aCells) {
                if (index > 0 && index < aCells.length - 1) { //  Skip first (name) & last (total) columns
                    var sValue = oCell.getValue().trim();

                    if (sValue === "L") { //  Count only "L" as Leave
                        iLeaveCount++;
                    } else {
                        var iValue = parseInt(sValue, 10);
                        iTotal += isNaN(iValue) ? 0 : iValue;
                    }
                }
            });

            // Update the total column
            var oTotalCell = oRow.getCells()[oRow.getCells().length - 1];
            oTotalCell.setValue(iTotal.toString());

            // Store Leave Count in Model for Chart
            // var oModel = this.getView().getModel();
            // var aEmployees = oModel.getProperty("/employees");
            var oEmployeeModel = this.getView().getModel("EmployeeModel");

            var sEmployeeName = oRow.getCells()[0].getText();
            var aEmployees = oEmployeeModel.getData();// Get Employee Name
            aEmployees.forEach(function (oEmp) {
                if (oEmp.NAME === sEmployeeName) {
                    oEmp.leaveCount = iLeaveCount; // Update leave count
                }
            });

            // oModel.setProperty("/employees", aEmployees);
            this.updateChart();
        },
        updateChart: function () {
            var oChart = this.getView().byId("leaveChart");


            // var oModel = this.getView().getModel();
            var oEmployeeModel = this.getView().getModel("EmployeeModel");
            oChart.setModel(oEmployeeModel);
            oChart.getModel().refresh(true);
        },


        OnDownloaddata: async function () {
            try {
                this.getView().byId("SplitContDemo").setBusyIndicatorDelay(0);
                this.getView().byId("SplitContDemo").setBusy(true);
                var oEmployeeTable = this.getView().byId("employeeTable");
                var oTimesheetTable = this.getView().byId("timesheetTable");
                var oVizFrame = this.getView().byId("leaveChart"); // Chart reference
                var oYearComboBox = this.getView().byId("yearComboBox");
                var oMonthComboBox = this.getView().byId("monthComboBox");

                var sSelectedYear = oYearComboBox.getSelectedKey() || new Date().getFullYear();
                var sSelectedMonth = oMonthComboBox.getSelectedKey() || new Date().toLocaleString("default", { month: "long" });

                var aEmployeeRows = oEmployeeTable.getItems();
                var aTimesheetRows = oTimesheetTable.getItems();
                var aColumns = oTimesheetTable.getColumns();

                if (!aEmployeeRows.length || !aTimesheetRows.length) {
                    MessageToast.show("No data available to download.");
                    return;
                }

                // Initialize Workbook
                var workbook = new ExcelJS.Workbook();
                var worksheet = workbook.addWorksheet("Timesheet");

                var aHeaderRow = ["Name", "Client", "Project", "Client ID"];
                var aDates = [];
                var aWeekendColumns = [];
                var sSelectedYear = oYearComboBox.getSelectedKey() || new Date().getFullYear(); // Get selected year

                // Extract column headers dynamically
                for (var i = 1; i < aColumns.length; i++) {

                    var sDateHeader = aColumns[i].getHeader().getText();
                    aHeaderRow.push(sDateHeader);
                    aDates.push(sDateHeader);
                    var oDate = new Date(`${sSelectedYear} ${sDateHeader}`);
                    if (oDate.getDay() === 6 || oDate.getDay() === 0) {
                        aWeekendColumns.push(sDateHeader);
                    }

                }
                aHeaderRow.push("Total");

                // Add Title Row
                let titleRow = worksheet.addRow([`Timesheet - ${sSelectedMonth} ${sSelectedYear}`]);
                titleRow.getCell(1).font = { bold: true, size: 14 };
                worksheet.mergeCells("A1:" + String.fromCharCode(65 + aHeaderRow.length - 1) + "1");

                // Add Empty Row
                worksheet.addRow([]);

                // Add Header Row with Styling
                let headerRow = worksheet.addRow(aHeaderRow);
                headerRow.eachCell((cell, colNumber) => {
                    cell.font = { bold: true, color: { argb: "FFFFFF" } };
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4F81BD" } };
                    cell.alignment = { horizontal: "center" };

                });
                worksheet.eachRow((row, rowIndex) => {
                    row.eachCell((cell, colIndex) => {
                        let sColumnHeader = aHeaderRow[colIndex - 1]; // Get the column header

                        // If the column is a weekend, apply gray fill to the entire column
                        if (aWeekendColumns.includes(sColumnHeader)) {
                            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D3D3D3" } };
                        }
                    });
                });

                var aData = [];

                aTimesheetRows.forEach(function (oTimesheetRow, index) {
                    var aEmployeeCells = aEmployeeRows[index].getCells();
                    var aTimesheetCells = oTimesheetRow.getCells();

                    var aRowData = [
                        aEmployeeCells[0].getText(),
                        aEmployeeCells[1].getText(),
                        aEmployeeCells[2].getText(),
                        aEmployeeCells[3].getText()
                    ];

                    for (var j = 1; j < aTimesheetCells.length; j++) {
                        var oCell = aTimesheetCells[j];
                        var sCellValue = "";

                        if (oCell.getMetadata().getName() === "sap.m.Input") {
                            sCellValue = oCell.getValue();
                        } else if (oCell.getMetadata().getName() === "sap.m.Text") {
                            sCellValue = oCell.getText();
                        }
                        aRowData.push(sCellValue);
                    }
                    aData.push(aRowData);
                });

                // Add Data Rows
                aData.forEach((row) => {
                    let excelRow = worksheet.addRow(row);
                    excelRow.eachCell((cell) => {
                        cell.alignment = { horizontal: "center" };
                    });
                });

                // Convert Chart to Image and Insert into Excel
                if (oVizFrame) {
                    var sSVG = oVizFrame.exportToSVGString();
                    var canvas = document.createElement("canvas");
                    var ctx = canvas.getContext("2d");
                    var img = new Image();

                    img.onload = function () {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        var chartImage = canvas.toDataURL("image/png");

                        // **STEP 2: Insert Image into Excel Sheet**
                        var imageId = workbook.addImage({
                            base64: chartImage.split(",")[1], // Extract base64 data
                            extension: "png"
                        });

                        worksheet.addImage(imageId, {
                            tl: { col: 7, row: aData.length + 7 }, // Position below table
                            ext: { width: 500, height: 300 }
                        });

                        //  **STEP 3: Save and Download Excel File**
                        workbook.xlsx.writeBuffer().then(function (buffer) {
                            var blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                            saveAs(blob, "Timesheet.xlsx");
                        });
                    };

                    img.src = "data:image/svg+xml;base64," + btoa(sSVG);
                } else {
                    // If no chart, just download the Excel file
                    workbook.xlsx.writeBuffer().then(function (buffer) {
                        var blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                        File.save(blob, "Timesheet.xlsx");
                    });
                }
                this.getView().byId("SplitContDemo").setBusy(false);
            } catch (error) {
                console.error("Error generating Excel:", error);
                MessageToast.show("Error generating Excel file.");
            }
        },
        onCreateEmployee: function () {
            if (!this.oDialog) {
                this.oDialog = sap.ui.xmlfragment("timesheetapp.Fragment.CreateFragment", this);
                this.getView().addDependent(this.oDialog);
            }
            this.oDialog.open();
        },
        // create a new employee
        onSaveEmployee: function () {
            var oView = sap.ui.getCore();

            // Get input values
            var sName = oView.byId("inpName").getValue();
            var sClient = oView.byId("inpClient").getValue();
            var sProject = oView.byId("inpProject").getValue();
            var sClientId = oView.byId("inpClientId").getValue();
            var sStartDate = oView.byId("inpStartDate").getDateValue();
            var sEndDate = oView.byId("inpEndDate").getDateValue();

            if (!sName || !sClient || !sProject || !sClientId || !sStartDate) {
                MessageToast.show("Please fill in all fields.");
                return;
            }
            var formattedEndDate = sEndDate ? sEndDate.toISOString().split("T")[0] : null;

            // Prepare the payload
            var oNewEmployee = {
                Name: sName,
                client: sClient,
                project: sProject,
                clientId: sClientId,
                StartDate: sStartDate.toISOString().split("T")[0], // Format date
                EndDate: formattedEndDate
            };
            var that = this;
            // Get OData Model
            var oModel = this.getOwnerComponent().getModel();
            // var oNewEmployee = JSON.stringify(oNewEmployeed)
            // Create new entry in backend
            oModel.callFunction("/Createnewemployee", {
                method: "GET",
                // urlParameters: newemployeedata,
                urlParameters: { newemployeedata: JSON.stringify(oNewEmployee) },
                success: function (oData) {
                    if (oData && oData.Createnewemployee && oData.Createnewemployee.error) {
                        sap.m.MessageToast.show(oData.Createnewemployee.error);
                    } else {
                        that.RetriveEmployeeDetails();
                        sap.m.MessageToast.show("Employee created successfully!",)
                        that.onCloseDialogCreate(); // ✅ Corrected call to onCloseDialog


                    }
                },
                error: function (err) {
                    sap.m.MessageToast.show("Failed to create employee.");
                }

            })
        },

        onCloseDialogCreate: function () {
            // this.getView().byId("newEmployeeDialog").close();
            this.oDialog.close();
        },
        onEmployeeSelect: function (oEvent) {
            var oTable = this.getView().byId("employeeTable");
            var oSelectedItem = oTable.getSelectedItem();

            if (oSelectedItem) {
                this.getView().byId("OnUpdateid").setEnabled(true);
                // this.getView().byId("employeeTable").removeSelections()
            } else {
                this.getView().byId("OnUpdateid").setEnabled(false);
            }
        },
        onUpdateEmployee: function () {
            var oTable = this.getView().byId("employeeTable");
            var oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                sap.m.MessageToast.show("Please select an employee to update.");
                return;

            }
            var oContext = oSelectedItem.getBindingContext("EmployeeModel");
            var oData = oContext.getObject();

            if (!this.oUpdateDialog) {
                this.oUpdateDialog = sap.ui.xmlfragment("timesheetapp.Fragment.UpdateFragment", this);
                this.getView().addDependent(this.oUpdateDialog);

            }
            sap.ui.getCore().byId("inpName1").setValue(oData.NAME);
            sap.ui.getCore().byId("inpClient1").setValue(oData.CLIENT);
            sap.ui.getCore().byId("inpProject1").setValue(oData.PROJECT);
            sap.ui.getCore().byId("inpClientId1").setValue(oData.CLIENTID);
            sap.ui.getCore().byId("inpStartDate1").setValue(oData.STARTDATE);
            sap.ui.getCore().byId("inpEndDate1").setValue(oData.ENDDATE);

            this.oUpdateDialog.open();

        },
        onCloseDialog: function () {
            this.oUpdateDialog.close();
        },
        onUpdatebuttonFragment: function () {
            var oView = sap.ui.getCore();

            // Get input values
            var sName = oView.byId("inpName1").getValue();
            var sClient = oView.byId("inpClient1").getValue();
            var sProject = oView.byId("inpProject1").getValue();
            var sClientId = oView.byId("inpClientId1").getValue();
            var sStartDate = oView.byId("inpStartDate1").getDateValue();
            var sEndDate = oView.byId("inpEndDate1").getDateValue();

            if (!sName || !sClient || !sProject || !sClientId || !sStartDate) {
                MessageToast.show("Please fill in all fields.");
                return;
            }
            var formattedEndDate = sEndDate ? sEndDate.toISOString().split("T")[0] : null;

            // Prepare the payload
            var oupdateEmployee = {
                Name: sName,
                client: sClient,
                project: sProject,
                clientId: sClientId,
                StartDate: sStartDate.toISOString().split("T")[0], // Format date
                EndDate: formattedEndDate
            };
            var that = this;
            // Get OData Model
            var oModel = this.getOwnerComponent().getModel();
            // var oNewEmployee = JSON.stringify(oNewEmployeed)
            // Create new entry in backend
            oModel.callFunction("/Updateemployee", {
                method: "GET",
                // urlParameters: newemployeedata,
                urlParameters: { updateemployeedata: JSON.stringify(oupdateEmployee) },
                success: function (oData) {
                    if (oData && oData.Updateemployee && oData.Updateemployee.error) {
                        sap.m.MessageToast.show(oData.Updateemployee.error);
                    } else {
                        that.RetriveEmployeeDetails();
                        that.updateChart();
                        sap.m.MessageToast.show("Employee Updated successfully!",)
                        that.onCloseDialog(); // ✅ Corrected call to onCloseDialog
                    }
                },
                error: function (err) {
                    sap.m.MessageToast.show("Failed to create employee.");
                }

            })

        },

        // SaveTimesheetData

        // OnSaveTimeSheetData: function () {
        //     var oTable = this.byId("timesheetTable"); 
        //     var aSelectedItems = oTable.getItems(); 

        //     var aLeaveData = [];
        //     aSelectedItems.forEach((oItem) => {
        //         var oContext = oItem.getBindingContext(); 
        //         var oRowData = oContext.getObject(); 

        //         // Extract values
        //         var sEmployeeName = oRowData.Name; 
        //         var sYear = this.byId("yearComboBox").getSelectedKey();
        //         var sMonth = this.byId("monthComboBox").getSelectedKey();
        //         var aLeaveDays = [];

        //         // Check each column (day-wise leave)
        //         for (var i = 1; i <= 31; i++) {
        //             if (oRowData["Day" + i] === "L") { // If the employee has taken leave
        //                 aLeaveDays.push(i.toString().padStart(2, "0")); // Format as "01", "02", etc.
        //             }
        //         }

        //         if (aLeaveDays.length > 0) {
        //             aLeaveData.push({
        //                 Name: sEmployeeName,
        //                 Year: parseInt(sYear),
        //                 Month: sMonth,
        //                 LeaveDays: aLeaveDays.join(",") // Store as comma-separated string
        //             });
        //         }
        //     });

        //     if (aLeaveData.length === 0) {
        //         sap.m.MessageBox.warning("No leave data to save.");
        //         return;
        //     }

        //     // Call backend service
        //     var oModel = this.getOwnerComponent().getModel();
        //     oModel.create("/SaveTimesheetData", aLeaveData, {
        //         success: function () {
        //             sap.m.MessageToast.show("Leave data saved successfully!");
        //         },
        //         error: function () {
        //             sap.m.MessageToast.show("Failed to save leave data.");
        //         }
        //     });
        // }
        OnSaveTimeSheetData: function () {
            var oTable = this.byId("timesheetTable");
            var aTableItems = oTable.getItems();

            var aLeaveData = [];
            var sYear = this.byId("yearComboBox").getSelectedKey();
            var sMonth = this.byId("monthComboBox").getSelectedKey();

            if (!sYear || !sMonth) {
                sap.m.MessageBox.warning("Please select both Year and Month.");
                return;
            }

            aTableItems.forEach((oItem) => {
                var aCells = oItem.getCells();

                // Employee Name is the first hidden cell
                var sEmployeeName = aCells[0].getText();
                var aLeaveDays = [];

                // Loop through day-wise input fields
                for (var i = 1; i < aCells.length - 1; i++) { // Skipping Employee Name & Total column
                    var uniqueID = Date.now() % 1000000000 + Math.floor(Math.random() * 1000);
                    var sValue = aCells[i].getValue();
                    if (sValue === "L") {
                        aLeaveDays.push(i.toString().padStart(2, "0")); // Format as "01", "02", etc.
                    }
                }

                if (aLeaveDays.length > 0) {
                    aLeaveData.push({
                        ID: uniqueID,
                        Name: sEmployeeName,
                        Year: parseInt(sYear),
                        Month: sMonth,
                        LeaveDays: aLeaveDays.join(",") // Store as comma-separated string
                    });
                }
            });

            if (aLeaveData.length === 0) {
                sap.m.MessageBox.warning("No leave data to save.");
                return;
            }

            // Get OData Model
            var oModel = this.getOwnerComponent().getModel();

            // Use batch processing to create multiple records
            oModel.callFunction("/SaveTimesheetData", {
                method: "GET",
                // urlParameters: newemployeedata,
                urlParameters: { Timesheetdata: JSON.stringify(aLeaveData) },
                success: function (oData) {
                    if (oData.SaveTimesheetData.message) {
                        sap.m.MessageToast.show("Timesheetdata saved successfully!");
                        that.RetriveEmployeeDetails(); // Refresh Employee Data
                        // that.onCloseDialog(); // Close the dialog if applicable
                    } else {
                        sap.m.MessageToast.show("Unexpected response from the server.");
                    }
                },
                error: function (error) {
                    sap.m.MessageToast.show(error);
                }
            });
        }





    });
});
