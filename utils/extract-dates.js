var fs = require("fs");
var path = require("path");
var async = require("async");
var yr = require("yearrange");
var mongoose = require("mongoose");
require("ukiyoe-models")(mongoose);

var ExtractedImage = mongoose.model("ExtractedImage");

var dates = {};
var outputFile = path.resolve(__dirname + "/../data/date-styles.csv");

var processImages = function(images) {
    images.forEach(function(image) {
        if (!image.dateCreated) {
            return;
        }

        var date = image.dateCreated;
        var key = yr.cleanString(date);
        key = key.replace(/[0-9]/g, "X");

        if (!dates[key]) {
            dates[key] = [];
        }

        dates[key].push(date);
    });
};

var done = function() {
    var sortedKeys = Object.keys(dates).sort(function(a, b) {
        return dates[b].length - dates[a].length;
    });

    var outStream = fs.createWriteStream(outputFile);

    outStream.write("Style\tCount\tExample\n");

    sortedKeys.forEach(function(key) {
        var data = [key, dates[key].length, dates[key][0]].join("\t");
        outStream.write(data + "\n");
    });

    outStream.end();
    outStream.on("finish", function() {
        process.stdout.write("DONE\n");
        process.exit(0);
    });
};

mongoose.connect('mongodb://localhost/extract');

mongoose.connection.on('error', function(err) {
    console.error('Connection Error:', err)
});

mongoose.connection.once('open', function() {
    ExtractedImage.batchQuery({}, 1000, function(err, data) {
        if (data.done) {
            process.stdout.write("\nProcessing...\n");
            done();
            return;
        }

        process.stdout.write("Processing " + data.from + " to " +
            data.to + "\r");
        processImages(data.images);
    });
});
