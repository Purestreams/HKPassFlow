//Mongoose7
const express = require('express');
const mongoose = require('mongoose');

const app = express();

// Middleware express.json() to parse JSON bodies
app.use(express.json());


mongoose.connect('mongodb://mongodb/HKPassFlow');

const dataSchema = new mongoose.Schema({
    Year: Number,
    Month: Number,
    Local: Number,
    Mainland: Number,
    Others: Number,
    Total: Number
});

const data = mongoose.model('monthlog', dataSchema, 'monthlog');

app.get('/all', async (req, res) => {
    const allData = await data.find();
    res.json(allData);
    console.log("All data has been printed");
});

// GET request to http://localhost:3000/HK/stat/2023/6

app.get('/HK/stat/:year/:month', async (req, res) => {
    //if month is Local, Mainland, Others, Total
    if (req.params.month === "Local" || req.params.month === "Mainland" || req.params.month === "Others" || req.params.month === "Total") {
        //[{"Month":1,"Mainland":11988},{"Month":2,"Mainland":34161},...
        var cata = req.params.month;
        console.log(cata);
        const year_temp = parseInt(req.params.year);
        var outputData = await data.find({Year: year_temp},{'_id': 0, 'Month': 1, [cata]: 1});
        res.json(outputData);
        console.log("Data has been printed")
        return;
    };

    const year = parseInt(req.params.year);
    if (year < 2021 || year > 2025) {
        res.status(400).json([{"error": "Wrong year - must be between 2021 - 2025."}])
        return;
    }
    const month = parseInt(req.params.month);
    if (month < 1 || month > 12) {
        res.status(400).json([{"error": "Wrong month - must be between 1 - 12."}])
        return;
    }
    var outputData = await data.find({Year: year, Month: month},{'_id': 0});
    if (outputData.length === 0) {
        const sentence = "No data for " + month + "/" + year;
        res.status(404).json([{"error": sentence}]);
        return;
    }
    res.json(outputData);
    console.log("Data has been printed")
});


// GET request to http://localhost:3000/HK/stat/2023 all year data

app.get('/HK/stat/:year', async (req, res) => {
    const year = parseInt(req.params.year);

    var year_Local = 0;
    var year_Mainland = 0;
    var year_Others = 0;
    var year_Total = 0;

    for (var i = 1; i <= 12; i++) {
        var outputData = await data.find({Year: year, Month: i},{'_id': 0});
        year_Local += outputData[0].Local;
        year_Mainland += outputData[0].Mainland;
        year_Others += outputData[0].Others;
        year_Total += outputData[0].Total;
    }
    res.json([{Year: year, Local: year_Local, Mainland: year_Mainland, Others: year_Others, Total: year_Total}]);

});

// POST request to http://localhost:3000/HK/stat with JSON body
app.post('/HK/stat', (req, res) => {
    //console.log(req.body);
    if (req.body == null) {
        res.status(400).json([{"error":"POST request - missing data."}]);
        return;
    }
    var receive = req.body;
    var data1 = receive[0];
    var data2 = receive[1];
    //distinguish the arrival data and departure data
    if (data1.Flow == "Arrival") {
        var Arrival = data1;
        var Departure = data2;
    }
    else {
        var Arrival = data2;
        var Departure = data1;
    }
    console.log(Arrival);
    console.log(Departure);
    //always save Arrival before Departure
    //[{"Year":2024,"Month":3,"Flow":"Arrival","Local":8374047,"Mainland":2466042,"Others":936189},{"Year":2024,"Month":3,"Flow":"Departure","Local":9291362,"Mainland":2489151,"Others":946946}]
    //check not duplicate
    var check = data.find({Year: Arrival.Year, Month: Arrival.Month});
    if (check.length > 0) {
        res.status(400).json([{"error": "Data already exists"}]);
        return;
    }

    //check error
    if (Arrival.Year != Departure.Year || Arrival.Month != Departure.Month) {
        res.status(400).json([{"error": "Arrival and Departure data do not match"}]);
        return;
    }
    //return the sum of the arrival and departure data
    Year = Arrival.Year;
    Month = Arrival.Month;
    Local = Arrival.Local - Departure.Local;
    Mainland = Arrival.Mainland - Departure.Mainland;
    Others = Arrival.Others - Departure.Others;
    Total = Local + Mainland + Others;
    res.json([{Year: Year, Month: Month, Local: Local, Mainland: Mainland, Others: Others, Total: Total}]);
    //save the data
    data.insertMany([{Year: Year, Month: Month, Local: Local, Mainland: Mainland, Others: Others, Total: Total}]);
});

//if the request is not matched
app.use(function (req, res) {
    //get the URL
    var url = req.originalUrl;
    //if get
    if (req.method === 'GET') {
        //"error":"Cannot GET /HK/stat/"
        var output = "error: Cannot GET " + url;
        res.status(404).json([{output}]);
    }
    //if post
    else if (req.method === 'POST') {
        //"error":"Cannot POST /HK/stat/"
        var output = "error: Cannot POST " + url;
        res.status(404).json([{output}]);
    }
});



app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
