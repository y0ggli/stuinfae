import * as d3 from 'd3';
import * as topojson from 'topojson';

let width = 950;
let height = 600;

const svg = d3.select('body')
    .append('svg')
    .attr('height', height)
    .attr('width', width);

let projection = d3.geoMercator()
    .scale(300)
    .translate([width / 2, height / 2]);

let path = d3.geoPath().projection(projection);




Promise.all([
    d3.csv('/data/Cereals1980-2016.csv'),
    d3.json('/data/africa.json')
])
    .then(([data, africa]) =>  {
        data.forEach(d => {
            d.Year = +d.Year;
            d.Value = +d.Value;
        });
        //console.log(data);
        //console.log(africa);
        draw(data, africa);
    }).catch( e => {
    throw e;
});


function draw(data, africa) {


    let g = svg.append('g');

    //Map
    let paths = g.selectAll('path')
        .data(topojson.feature(africa, africa.objects.continent_Africa_subunits).features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr("class", "africa");


    let areaHarvested = data.filter(d => {
        if ((d.Year === 2016 || d.Year === 1980) && d.Element === "Area harvested") {
            for (let i = 0; i < paths.data().length; i++) {
                let p = paths.data()[i];
                if( p.properties.geounit === d["Area"])
                    return true
            }
        }
    }).sort((a,b) => { return b.Year - a.Year});

    areaHarvested = combineValues(areaHarvested);
    console.log(areaHarvested);


    let radius = d3.scaleSqrt()
        .domain([d3.min(areaHarvested, d=> {return getMinYear(d).Value}), d3.max(areaHarvested, d=> {return getMaxYear(d).Value})])
        .range([1 , 15]);

    //Area Harvested
    let enterCircles = g.selectAll('circle')
        .data(areaHarvested)
        .enter();

        enterCircles
        .append("circle")
        .attr('class', 'bubble')
        .attr("r", d=> {return radius(getValueForYear(d,2016))})
        .attr("fill", '#66ffa6')
        .attr('stroke', '#66ffa6')
        .attr("transform", d => {
            for (let i = 0; i < paths.data().length; i++) {
                let p = paths.data()[i];
                if (p.properties.geounit === d["Name"]) {
                    return "translate(" + path.centroid(p) + ")";
                }
            }
        });

        enterCircles
        .append("circle")
        .attr('class', 'bubble')
        .attr("r", d=> {return radius(getValueForYear(d,1980))})
        .attr('stroke', '#00e676')
        .attr('fill', d => {
            console.log(getMaxYear(d).Year);
            if (getMaxYear(d).Year === 1980){
                return 'none'
            } else {
                return '#00e676'
            }
        })
        .attr("transform", d => {
            for (let i = 0; i < paths.data().length; i++) {
                let p = paths.data()[i];
                if (p.properties.geounit === d["Name"]) {
                    return "translate(" + path.centroid(p) + ")";
                }
            }
        });


    let production = data.filter(d => {
        if ((d.Year === 2016 || d.Year === 1980) && d.Element === "Production")
            for (let i = 0; i < paths.data().length; i++) {
                let p = paths.data()[i];
                if( p.properties.geounit === d["Area"])
                    return true
            }
    }).sort((a,b) => { return b.Year - a.Year});


    let height = d3.scaleLinear()
        .domain([d3.min(production, d => {return d.Value}), d3.max(production, d => {return d.Value})])
        .range([2,30]);




    //Production
    g.selectAll('rect')
        .data(production)
        .enter()
        .append("rect")
        .attr('class', 'bar')
        .attr("width",4)
        .attr("height", d =>{return height(d.Value)})
        .attr("fill", d => {
            if (d.Year === 1980){
                return '#0081cb'
            } else if (d.Year === 2016) {
                return '#00b0ff'
            }
        })
        .attr("transform", (d) => {
            for (let i = 0; i < paths.data().length; i++) {
                let p = paths.data()[i];
                if (p.properties.geounit === d["Area"]) {
                    //console.log(p.properties.geounit+ " " +path.centroid(p));
                    return "translate(" + (path.centroid(p)[0] - 2) + ","+ (path.centroid(p)[1] - height(d.Value)) + ")";
                }
            }
        });
}


function combineValues(areas) {
    let combinedAreas = [];
    for( let area of areas) {
        let obj = combinedAreas.find(val => {return val.Name === area.Area});
        if (obj !== undefined ){
            obj.Years.push({
                Year: area.Year,
                Value: area.Value
            });
        } else {
            let obj = {
                Name: area.Area,
                Element: area.Element,
                Unit: area.Unit,
                Years: [{
                     Year: area.Year,
                     Value: area.Value
                    }
                ]
            };
            combinedAreas.push(obj);
        }
    }
    return combinedAreas;
}


function getMinYear(area) {
    let min = area.Years[0].Value;
    for (let year of area.Years) {
        if (year.Value < min){
            min = year;
        }
    }
    return min;
}

function getMaxYear(area) {
    let max = area.Years[0].Value;
    for (let year of area.Years) {
        if (year.Value > max){
            max = year;
        }
    }
    return max;
}

function getValueForYear(area, year) {
    let a = area.Years.find(val => val.Year === year);
    return (a === undefined) ? 0 : a.Value;

}



