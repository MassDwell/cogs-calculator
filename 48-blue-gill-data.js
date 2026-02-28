// 48 Blue Gill Lane Plymouth - Actual Cost Data from Excel
const blueGillActualData = {
    projectName: "48 Blue Gill Lane Plymouth",
    model: "classic", // 575 sqft, 2 bed/1 bath
    sqft: 575,
    beds: 2,
    baths: 1,
    
    // Mapped actual costs from Excel data
    actualCosts: {
        structure: {
            steelMaterial: {
                estimated: 21850, // $38/sqft x 575
                actual: 17220,    // From "Real Estimate" column
                notes: "Included snow removal, rework at client's request, inspection"
            },
            steelLabor: {
                estimated: 3450, // $6/sqft x 575  
                actual: 17220,   // Combined with material in actual
                notes: "20 days work time"
            }
        },
        electrical: {
            electricalPackage: {
                estimated: 14000,
                actual: 13000,
                notes: "Luis - on contract"
            }
        },
        hvac: {
            miniSplitSystem: {
                estimated: 5000,
                actual: null, // "waiting on 2 estimates"
                notes: "Waiting on 2 estimates"
            }
        },
        roofing: {
            roofingComplete: {
                estimated: 4959,
                actual: 3203.57, // $1400 labor + $1803.57 material
                notes: "Done - 1 day, 16 hours work"
            }
        },
        exterior: {
            siding: {
                estimated: 4000,
                actual: 5530.33, // $2800 labor + $2730.33 material
                notes: "Labor estimated"
            },
            windows: {
                estimated: 4050,
                actual: 1315.94, // $280 labor + $1035.94 material
                notes: "Done - 8 hours work"
            },
            exteriorDoors: {
                estimated: 1825,
                actual: 1897.54, // $280 labor + $1617.54 material  
                notes: "Done - 8 hours work"
            }
        },
        interior: {
            flooring: {
                estimated: 4456,
                actual: 6000, // $3000 labor + $3000 material
                notes: "Interior flooring complete"
            },
            doorsAndTrim: {
                estimated: 3000,
                actual: 8300, // $4800 labor + $3500 material
                notes: "Baseboard, doors, trim, cabinet, closet"
            },
            paint: {
                estimated: 13369,
                actual: 3500,
                notes: "DoCarmo - on contract"
            },
            drywall: {
                estimated: 13369,
                actual: 5500,
                notes: "Marreco - on contract"
            }
        },
        kitchen: {
            kitchen: {
                estimated: 8775,
                actual: 5000,
                notes: "Steve paid"
            },
            appliances: {
                estimated: 4488,
                actual: 5081.29,
                notes: "LG appliances - Steve paid"
            }
        },
        bathroom: {
            fixtures: {
                estimated: 4892,
                actual: null,
                notes: "TBD"
            },
            showerTile: {
                estimated: 1400,
                actual: 4000, // $3300 labor + $700 material
                notes: "Nilo - on contract"
            }
        },
        plumbing: {
            plumbing: {
                estimated: 14100,
                actual: 14100,
                notes: "Panorama - on contract"
            }
        },
        insulation: {
            insulation: {
                estimated: 3364,
                actual: 13603.1,
                notes: "OX Board Exterior + Interior"
            }
        },
        deck: {
            deck: {
                estimated: 8430,
                actual: null,
                notes: "TBD"
            }
        },
        sitework: {
            sitework: {
                estimated: 6500,
                actual: 8774.21, // $6545 labor + $2229.21 material
                notes: "Site + Corrective work - 7 days, 19 hours"
            }
        },
        miscellaneous: {
            extraBathroom: {
                estimated: 0,
                actual: 850, // $510 material cost
                notes: "5 months of portable estimated"
            },
            winterConditions: {
                estimated: 0,
                actual: 1260, // 1 day, 12 hours work
                notes: "Snow removal"
            },
            lighting: {
                estimated: 1825,
                actual: null,
                notes: "TBD"
            }
        }
    },
    
    totals: {
        estimated: 165190,
        actualPaid: 114635.98,
        remainingToPay: 50813.84,
        totalActual: 114635.98 + 50813.84 // Will be calculated
    }
};

export default blueGillActualData;