Surveillance = (function (hostSpecies) {
    var numberFormat = d3.format(".2f");

    var surveillance = {};

    surveillance.species = hostSpecies;

    surveillance.sequenceMap = dc.geoChoroplethChart("#sequenceMap");
    surveillance.hostChart = dc.rowChart("#host-chart");
    surveillance.timeChart = dc.barChart("#time-chart");
    surveillance.abundanceMap = dc.geoChoroplethChart("#abundanceMap");
    surveillance.coverageMap = dc.geoChoroplethChart("#coverageMap");

    // Various formatters.
    var formatNumber = d3.format(",d"),
        formatDate = d3.time.format("%Y-%m-%d"),
        formatDate2 = d3.time.format("%d/%m/%Y"),
        formatMonth = d3.time.format("%Y-%m"),
        formatYear = d3.time.format("%Y"),
        formatPrettyDate = d3.time.format("%d %b"),
        formatMonth = d3.time.format("%b %Y");

    queue()
        .defer(d3.csv, "data/IRDB_Isolates.csv")
        .defer(d3.csv, "data/populations.csv")
        .defer(d3.json, "geo/countries_50m.json")
        .await(ready);

    function ready(error, isolateData, populationData, locationsJson) {
        if (error) return console.log("there was an error loading the data: " + error);

        // populationData fields:
        //country,ISO3,continent,chicken,duck,swine,human

        var countryMap = {};
        var iso3Map = {};
        var countries = [];

        populationData.forEach(function (d, i) {
            d.name = d.country;
            d.key = d.ISO3;
            d.chickenSeq = 0;
            d.duckSeq = 0;
            d.swineSeq = 0;
            d.duck = parseInt(d.duck);
            d.chicken = parseInt(d.chicken);
            d.swine = parseInt(d.swine);

            // set missing data as zero - to handle later...
//            d.duck = (isNaN(d.duck) ? 0 : d.duck);
//            d.chicken = (isNaN(d.chicken) ? 0 : d.chicken);
//            d.swine = (isNaN(d.swine) ? 0 : d.swine);

            countryMap[d.key] = d;
            iso3Map[d.name] = d.key;
            countries.push(d);

//            console.log("Country: " + d.name + " (" + d.key + ")");
        });

        var isolates = [];

        // isolates fields:
        // Strain Name,Complete Genome,Subtype,Collection Date,Host,Country,State/Province,Geographic Grouping,Submission date,

        var sumDuckSeq = 0, sumChickenSeq = 0, sumSwineSeq = 0, sumSeq = 0;

        // A little coercion, since the CSV is untyped.
        isolateData.forEach(function (d, i) {
            d.date = formatDate2.parse(d["Collection Date"]);
            if (d.date == null) {
                d.date = formatDate.parse(d["Collection Date"]);
            }
            if (d.date == null) {
                d.date = formatMonth.parse(d["Collection Date"]);
            }
            if (d.date == null) {
                d.date = formatYear.parse(d["Collection Date"]);
            }
            var h = (d.Host || "").toLowerCase();

            if (h.indexOf("duck") !== -1) {
                d.host2 = "duck";
                sumDuckSeq += 1;
            } else if (h.indexOf("chicken") !== -1) {
                d.host2 = "chicken";
                sumChickenSeq += 1;
            } else if (h.indexOf("swine") !== -1 || h.indexOf("pig") !== -1) {
                d.host2 = "swine";
                sumSwineSeq += 1;
            } else {
                d.host2 = null;
            }

            if (iso3Map[d.Country] !== undefined) {
                d.country = countryMap[iso3Map[d.Country]];
                if (d.host2 !== null) {
                    d.country[d.host2 + "Seq"] += 1;
                }
            } else {
                console.log(d["Strain Name"] + ": Missing country, " + d.Country);
            }

            if (d.date !== null && d.country !== null && !(typeof d.country === "undefined")) {
                isolates.push(d);
            }
        });

        sumSeq = sumDuckSeq + sumChickenSeq + sumSwineSeq;

        console.log("Total chicken sequences: " + sumChickenSeq);
        console.log("Total ducks sequences: " + sumDuckSeq);
        console.log("Total swine sequences: " + sumSwineSeq);
        console.log("Total sequences: " + sumSeq);

        var sumDuck = 0, sumChicken = 0, sumSwine = 0, sum = 0;

        for (i = 0; i < countries.length; i++) {
            d = countries[i];
            sumDuck += (isNaN(d.duck) ? 0 : d.duck);
            sumChicken += (isNaN(d.chicken) ? 0 : d.chicken);
            sumSwine += (isNaN(d.swine) ? 0 : d.swine);
        }

        sum = sumDuck + sumChicken + sumSwine;

        console.log("Total chickens: " + sumChicken);
        console.log("Total ducks: " + sumDuck);
        console.log("Total swine: " + sumSwine);
        console.log("Total: " + sum);

        var duckSeqPerShare = sumDuckSeq / sumDuck;
        var chickenSeqPerShare = sumChickenSeq / sumChicken;
        var swineSeqPerShare = sumSwineSeq / sumSwine;

        for (i = 0; i < countries.length; i++) {
            d = countries[i];

            var check = function (d) {
                return d !== undefined && isFinite(d) ? d : NaN;
            }

            var average = function (d) {
                var a = 0.0;
                var c = 0;

                if (!isNaN(d['duck'])) {
                    a += d['duck'];
                    c += 1;
                }
                if (!isNaN(d['chicken'])) {
                    a += d['chicken'];
                    c += 1;
                }
                if (!isNaN(d['swine'])) {
                    a += d['swine'];
                    c += 1;
                }
                return a / c;
            }

            d.proportion = {};
            d.proportion.duck = d.duck / sumDuck;
            d.proportion.chicken = d.chicken / sumChicken;
            d.proportion.swine = d.swine / sumSwine;

            d.abundance = {};
            d.abundance.duck = check(d.proportion.duck);
            d.abundance.chicken = check(d.proportion.chicken);
            d.abundance.swine = check(d.proportion.swine);
            d.abundance.all = average(d.abundance);

            d.sequenceProportion = {};
            d.sequenceProportion.duck = d.duckSeq / sumDuckSeq;
            d.sequenceProportion.chicken = d.chickenSeq / sumChickenSeq;
            d.sequenceProportion.swine = d.swineSeq / sumSwineSeq;
            d.sequenceProportion.all = average(d.sequenceProportion);

//            d.expDuck = d.duck * duckSeqPerShare;
//            d.expChicken = d.chicken * chickenSeqPerShare;
//            d.expSwine = d.swine * swineSeqPerShare;
//            d.exp = d.expDuck + d.expChicken + d.expSwine;

            d.expect = {};
            d.expect.duck = d.proportion.duck;
            d.expect.chicken = d.proportion.chicken;
            d.expect.swine = d.proportion.swine;
            d.expect.all = average(d.expect);

            d.actual = {};
            d.actual.duck = d.sequenceProportion.duck;
            d.actual.chicken = d.sequenceProportion.chicken;
            d.actual.swine = d.sequenceProportion.swine;
            d.actual.all = average(d.actual);

            d.score = {};
            d.score.duck = (d.expect.duck > 0 ? (d.expect.duck - d.actual.duck) : NaN);
            d.score.chicken = (d.expect.chicken > 0 ? (d.expect.chicken - d.actual.chicken) : NaN);
            d.score.swine = (d.expect.swine > 0 ? (d.expect.swine - d.actual.swine) : NaN);
            d.score.all = (d.expect.all > 0 ? (d.expect.all - d.actual.all) : NaN);

//            d.diffDuck = Math.log(d.expDuck) - Math.log(d.actDuck);
//            d.diffChicken = Math.log(d.expChicken) - Math.log(d.actChicken);
//            d.diffSwine = Math.log(d.expSwine) - Math.log(d.actSwine);
//            d.diff = Math.log(d.exp) - Math.log(d.act);

            console.log(d.name +
                "," + d.chicken + "," + d.duck + "," + d.swine +
                "," + d.chickenSeq + "," + d.duckSeq + "," + d.swineSeq +
                "," + d.abundance.chicken + "," + d.abundance.duck + "," + d.abundance.swine + "," + d.abundance.all +
                "," + d.sequenceProportion.chicken + "," + d.sequenceProportion.duck + "," + d.sequenceProportion.swine + "," + d.sequenceProportion.all +
                "," + d.score.chicken + "," + d.score.duck + "," + d.score.swine + "," + d.score.all);
        }

        surveillance.isolatesCrossfilter = crossfilter(isolates);

        var location = surveillance.isolatesCrossfilter.dimension(function (d) {
            return d.country.name;
        });
        var locations = location.group().reduceSum(function (d) {
            return 1;
        });

        var host = surveillance.isolatesCrossfilter.dimension(function (d) {
            return d.host2;
        });
        var hosts = host.group(function (d) {
            return d;
        });

        var date = surveillance.isolatesCrossfilter.dimension(function (d) {
            return d.date;
        });
        var years = date.group(d3.time.year);

        var width = 640,
            height = 320;

        var projection = d3.geo.robinson()
            .scale(120)
            .translate([width / 2, height * 0.55])
            .precision(.1);


        var minSeq = 1;
        var maxSeq = 10000;
        console.log("Min seq: " + minSeq);
        console.log("Max seq: " + maxSeq);

        var colors1 = [ '#ccc' ].concat(colorbrewer.YlGn[9]);
//        var colors1 = colorbrewer.YlGn[9];

//        var color = d3.scale.quantile()
//            .domain([Math.log(minSeq), Math.log(maxSeq)])
//            .range(colors1);
        var color = d3.scale.threshold()
            .domain([1,5,10,50,100,500,1000,5000,10000])
            .range(colors1);

        surveillance.sequenceMap.width(width)
            .height(height)
            .transitionDuration(100)
            .dimension(location)
            .group(locations)
            .colors(color)
//            .colorCalculator(function (d) {
//                return d > 0 ? surveillance.sequenceMap.colors()(d) : colors1[0];
//            })
            .overlayGeoJson(locationsJson.features, "location", function (d) {
                return d.properties.admin;
            })
            .projection(projection)
            .on("filtered", function () {
                dc.renderAll();
            })
            .title(function (d) {
                var c = countryMap[iso3Map[d.key]];
                if (c !== undefined) {
                                    return "Location: " + d.key +
                    "\rChicken sequences: " + c.chickenSeq +
                    "\rDuck sequences: " + c.duckSeq +
                    "\rSwine sequences: " + c.swineSeq +
                    "\rTotal: " + (c.chickenSeq + c.duckSeq + c.swineSeq) +
                    (surveillance.species === 'all' ?
                        "\rProportion: " + f2(c.sequenceProportion.all, 5) :
                        "\rProportion " + surveillance.species + ": " + f2(c.sequenceProportion[surveillance.species], 5));


                } else {
                    return "Location: " + d.key + "\rSequences: n/a"

                }

            });

        colorlegend("#sequenceLegend", color, "quantile",
            {title: "Sequences sampled",
                isVertical: true,
                linearBoxes: 10,
                labels: [0].concat(color.domain())
//               labels: function(d) { return f0(Math.exp(d))}
            });


        surveillance.hostChart.width(280)
            .height(200)
            .transitionDuration(100)
            .margins({top: 0, right: 20, bottom: 38, left: 20})
            .group(hosts)
            .dimension(host)
            .colors(d3.scale.category20())
            .label(function (d) {
                return d.value + " " + d.key;
            })
            .title(function (d) {
                return d.value;
            })
            .elasticX(true)
            .on("filtered", function () {
                dc.renderAll();
            })
            .xAxis().ticks(5);

        surveillance.timeChart.width(900)
            .transitionDuration(100)
            .height(200)
            .margins({top: 10, right: 20, bottom: 40, left: 80})
            .dimension(date)
            .group(years)
            .centerBar(true)
            .x(d3.time.scale().domain([new Date(1970, 0, 1), new Date()]))
            .elasticY(true)
            .round(d3.time.year.round)
            .xUnits(d3.time.years);

        surveillance.countryFilter = crossfilter(countries);

        surveillance.allCases = surveillance.countryFilter.dimension(function(d) { return d; });

        var abundance = surveillance.countryFilter.dimension(function (d) {
            return d.name;
        });
        var abundanceGroup = abundance.group().reduceSum(function (d) {
            return d.abundance[surveillance.species];
        });

        var differenceFromExpectation = surveillance.countryFilter.dimension(function (d) {
            return d.name;
        });
        var differenceGroup = differenceFromExpectation.group().reduceSum(function (d) {
            return d.score[surveillance.species];
        });

        var minAbundance = d3.min(countries, function (d) {
            return d.abundance[surveillance.species]
        });
        var maxAbundance = d3.max(countries, function (d) {
            return d.abundance[surveillance.species]
        });
        console.log("Min abundance: " + minAbundance);
        console.log("Max abundance: " + maxAbundance);

        var minAbundance = 1e-6;
        var maxAbundance = 1;


        var colors = [ '#888' ].concat(colorbrewer.YlGnBu[9]);

        var color2 = d3.scale.quantile()
            .domain([Math.log(minAbundance), Math.log(maxAbundance)])
            .range(colors);

        var f1 = d3.format("2.1p")
        var f2 = d3.format("2.2p")

        surveillance.abundanceMap.width(width)
            .height(height)
            .transitionDuration(100)
            .dimension(abundance)
            .group(abundanceGroup)
            .colors(color2)
            .colorCalculator(function (d) {
                return isNaN(d) || d == undefined ? '#888' : surveillance.abundanceMap.colors()(Math.log(d));
            })
            .overlayGeoJson(locationsJson.features, "location", function (d) {
                return d.properties.admin;
            })
            .projection(projection)
            .on("filtered", function () {
                dc.renderAll();
            })
            .title(function (d) {
                return "Location: " + d.key +
                    "\rHost species " + surveillance.species +
                    "\rGlobal proportion " + (!isNaN(d.value) ? f2(d.value) : "n/a" );
            });


        colorlegend("#abundanceLegend", color2, "quantile",
            {title: "Proportion of " + (surveillance.species === "all" ? "animals" : surveillance.species),
                isVertical: true,
                linearBoxes: 10,
                labels: ["n/a", ">" + f1(1.0E-5), "", ">" + f1(1.0E-4), "", ">" + f1(1.0E-3), "", ">" + f1(1.0E-2), "", ">" + f1(1.0E-1)]
//                labels: function(d) { return f(Math.exp(d))}}
            });


        var minCoverage = d3.min(countries, function (d) {
            return d.score[surveillance.species]
        });
        var minUndersampling = d3.min(countries, function (d) {
            return d.score[surveillance.species] > 0 ? d.score[surveillance.species] : NaN;
        });
        var maxUndersampling = d3.max(countries, function (d) {
            return d.score[surveillance.species]
        });
        console.log("Min coverage: " + minCoverage);
        console.log("Min undersampling: " + minUndersampling);
        console.log("Max undersampling: " + maxUndersampling);

//        var minCoverage = 1;
        //var maxCoverage = 0;


//        var color3 = d3.scale.linear()
//            .domain([d3.min(countries, function (d) {return d.score[species]}), 0, d3.max(countries, function (d) {return d.score[species]})])
//            .range(["blue", "blue", "red"])
//            .interpolate(d3.interpolateLab);

        var colors3 = [ '#888' ].concat(colorbrewer.YlOrRd[9]);
//        var colors3 = colorbrewer.RdYlGn[9];
//        var colors3 = colorbrewer.YlOrRd[9];

        var color3 = d3.scale.quantile()
//            .domain([Math.log(minCoverage), Math.log(maxCoverage)])
            .domain([NaN, Math.log(minUndersampling), Math.log(maxUndersampling)])
            .range(colors3);

        var f0 = d3.format("2.2r")

        surveillance.coverageMap.width(width)
            .height(height)
            .transitionDuration(100)
            .dimension(differenceFromExpectation)
            .group(differenceGroup)
            .colors(color3)
            .colorCalculator(function (d) {
                return (d < 0 ? colorbrewer.Greens[9][4] : (d == 0 ? colors3[0] : surveillance.coverageMap.colors()(Math.log(d))));
            })
            .overlayGeoJson(locationsJson.features, "location", function (d) {
                return d.properties.admin;
            })
            .projection(projection)
            .on("filtered", function () {
                dc.renderAll();
            })
            .title(function (d) {
                return "Location: " + d.key +
                    "\rHost species " + surveillance.species +
                    "\rExpected: " + (countryMap[iso3Map[d.key]] != undefined ? d3.round(countryMap[iso3Map[d.key]].expect[surveillance.species], 5) : 'n/a') +
                    "\rActual: " + (countryMap[iso3Map[d.key]] != undefined ? d3.round(countryMap[iso3Map[d.key]].actual[surveillance.species], 5) : 'n/a') +
                    "\rScore: " + (countryMap[iso3Map[d.key]] != undefined ? d3.round(countryMap[iso3Map[d.key]].score[surveillance.species], 5) : 'n/a')
            });

        colorlegend("#coverageLegend", color3, "quantile",
        {title: surveillance.species === 'all' ? "Undersampling" : surveillance.species + " undersampling",
                isVertical: true,
                labels: ["n/a", "", ">" + f1(1.0E-4), "", ">" + f1(1.0E-3), "", ">" + f1(1.0E-2), "", ">" + f1(1.0E-1), ""]
//                labels: function (d) {
//                    return f0(Math.exp(d))
//                }
            });

        dc.renderAll();
    };

    surveillance.setHost = function(host) {
        surveillance.species = host;
        surveillance.allCases.filterAll();
        dc.redrawAll();
    }

    return surveillance;
});
