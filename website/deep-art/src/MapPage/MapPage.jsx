import React, { Component } from 'react';
import Plot from 'react-plotly.js';
import GenArt from './GenArt.jsx';
import { Box} from 'grommet';

export default class MapExplorePage extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            data: [],
            layout: {}, 
            images: {201671:{}, 202194:{}}, 
            config: {},
            mouseCoords: [],
            neighborCoords: {} 
        };

        this.generateInterpSeed = this.generateInterpSeed.bind(this);
        this.setCoords = this.setCoords.bind(this);
    }

    getImages() {
        let thumbnailRoot = "https://deepartstorage.blob.core.windows.net/public/thumbnails2/";
        let paintingIds = [1002, 10024, 10025, 10026, 10028];
        let paintingUrls = paintingIds.map(id => thumbnailRoot + id.toString() + ".jpg");
        let imageProps = {
            "xref": "x",
            "yref": "y",
            "sizex": 0.2,
            "sizey": 0.2,
            "xanchor": "left",
            "yanchor": "top",
            "layer": "below"
        };
        let locations = [[0.2, 0.8],[0.4, 0.4],[0.8, 0.6],[1.1, 0.8],[0.6, 1.0]];
        let images = paintingUrls.map((url, i) => Object.assign(
            {
                "source": url,
                "x": locations[i][0],
                "y": locations[i][1]
            },
            imageProps));
        console.log(images);
        return images;
    }

    componentDidMount(){
        this.populateImageSeeds();
    }

    populateImageSeeds(){
        let imageIDs = Object.keys(this.state.images);
        const imageToSeedUrl="https://deepartstorage.blob.core.windows.net/public/inverted/biggan1/seeds/";
        for (let i =0; i<imageIDs.length; i++){
            const fileName = imageIDs[i]+".json";
            const Http = new XMLHttpRequest();
            Http.open("GET", imageToSeedUrl+fileName);
            Http.send();
            Http.onreadystatechange = (e) => {
                if (Http.readyState === 4) {
                    try {
                        let response = JSON.parse(Http.responseText);
                        let imagesString = JSON.stringify(this.state.images);
                        let imagesCopy = JSON.parse(imagesString);
                        imagesCopy[imageIDs[i]].latents = response.latents;
                        imagesCopy[imageIDs[i]].labels = response.labels;
                        this.setState({
                            images: imagesCopy
                        });
                    } catch {
                        console.log('malformed request:' + Http.responseText);
                    }
                }
            }
        }
    }

    /**
     * Calls an API, sending a seed, and getting back an ArrayBuffer reprsenting that image
     * This function directly saves the image data and ArrayBuffer to state
     * @param {string} seedArr - string version of a 1xSEED_LENGTH array of floats between -1,1  
     * @param {Float[]} labelArr - data version of a 1000 length array of floats between 0,1
     */
    getGenImage(seedArr, labelArr) {
        //console.log("HELLO: "+seedArr)

        // let max = labelArr.reduce(function(a, b) {
        //     return Math.max(a, b);
        // });
        // let maxIndex = labelArr.indexOf(max);
        let labels = labelArr.toString();
        labels = `[[${labels}]]`;

        const apiURL = 'https://methack-api.azure-api.net/biggan/labels?subscription-key=43d3f563ea224c4c990e437ada74fae8';
        const Http = new XMLHttpRequest();
        const data = new FormData();
        data.append('seed',seedArr);
        data.append('labels', labels);
        //data.append('category', maxIndex.toString());

        Http.responseType = "arraybuffer";
        Http.open("POST", apiURL);
        Http.send(data);
        Http.onreadystatechange = (e) => {
            if (Http.readyState === 4){
                try{
                    let imgData = btoa(String.fromCharCode.apply(null, new Uint8Array(Http.response)));
                    this.setState({genImg: imgData, genArr: Http.response});

                } catch (e) {
                    console.log('malformed request:'+Http.responseText);
                }
            }
        }
    }

    getData() {
        let data =
            [{
                type: 'scatter',
                mode: 'markers+text',
                text: [
                    '(0) [0.2, 0.8]', '(1) [0.4, 0.4]', '(2) [0.8, 0.6]', '(3) [1.1, 0.8]', '(4) [0.6, 1.0]'
                ],
                x: [
                    0.2, 0.4, 0.8, 1.1, 0.6
                ],
                y: [
                    0.8, 0.4, 0.6, 0.8, 1.0
                ],

                marker: {
                    size: 7,
                    color: [
                        '#bebada', '#fdb462', '#fb8072', '#d9d9d9', '#fdc412'
                    ],
                    line: {
                        width: 1
                    }
                },
                name: 'Canadian cities',
                textposition: [
                    'top right', 'top left', 'top center', 'bottom right', 'bottom left'
                ],
            }];
        return data;
    }

    getLayout() {

        let mouseX = this.state.mouseCoords[0];
        let mouseY = this.state.mouseCoords[1];
        let neighCoords = this.state.neighborCoords;

        let lines = Object.keys(this.state.neighborCoords).map(index => (
            {
                type: 'line',
                x0: mouseX,
                y0: mouseY,
                x1: neighCoords[index][0],
                y1: neighCoords[index][1],
                line: {
                    color:'rgb(55, 128, 191)',
                    width:3
                }
            }
        ))

        let layout = {
            margin: { 'l': 0, 'r': 0, 't': 0, 'b': 0 },
            xaxis: { range: [0.1, 1.3] },
            yaxis: { range: [0.1, 1.3] },
            shapes : lines,
            hovermode: 'closest',
            images: this.getImages(),
            autosize: true,
        };
        return layout
    }

    render() {
        return (
            <div >
                <Box
                    align= 'center'
                    style= {{ marginTop: '25px' }}
                >
                    <GenArt image={this.state.genImg} data={this.state.genArr} />
                </Box>

                <Box
                    id="plotlyBox"
                    align='center'
                    style={{ padding: '2px', marginTop: '25px', width: "100%", height: "100%" }}
                    border={{ color: "black", size: "4px" }}
                    round="small"
                    onMouseDown={(e) => this.onMouseClick(e)}
                    onMouseMove={(e) => this.onMouseHover(e)}
                >

                    <Plot 
                        data={this.getData()}
                        layout={this.getLayout()}
                        onHover={(figure) => this.handleHover(figure)}
                        onInitialized={this.initializeData()}
                        style={{ width: "100%", height: "100%" }}
                        useResizeHandler={true}
                        config={{ displayModebar: false }}
                    />
                </Box>
            </div>
        );          
    }


    initializeData() {
        this.state.data = this.getData();
    }

    /* 
     * Handles when a custom coordinate in the graph has been selected. 
     */
    onMouseClick(e) {
        //get plotly coordinates
        let relCoords = this.convertToRelativeCoords(e.pageX, e.pageY);
        let plotlyCoords = this.convertToPlotlyData(relCoords[0], relCoords[1]);
        //find nearest neighbors on graph
        let closestNeighbors = this.getNearestNeighbors(plotlyCoords, 2);
        closestNeighbors = {201671:5, 202194:3};
        let latentAndLabel = this.generateInterpSeed(closestNeighbors);

        let latent = `[[${latentAndLabel.latent}]]`
        let label = latentAndLabel.label

        //seed is in format '[[fl,fl,fl,...#140]]
        //labels is in format [fl, fl, fl, ...#1000]
        this.getGenImage(latent, label);

    }

    onMouseHover(e) {
        //let relCoords = this.convertToRelativeCoords(eventData.pageX, eventData.pageY);
        //console.log("relative coords: " + relCoords);
        //let plotlyCoords = this.convertToPlotlyData(relCoords[0], relCoords[1]);
        //console.log("plotly coords: " + plotlyCoords);

        this.setCoords(e);
    }

    setCoords(e){
                //Get plotly coordinates
                let relCoords = this.convertToRelativeCoords(e.pageX, e.pageY);
                let plotlyCoords = this.convertToPlotlyData(relCoords[0], relCoords[1]);
        
                //find nearest enighbors on graph
                let closestNeighbors = this.getNearestNeighbors(plotlyCoords, 2);
                let neighborIDs = Object.keys(closestNeighbors);
        
                let neighCoords= {}
                
                for(let i = 0; i< neighborIDs.length; i++){
                    let id = closestNeighbors[i];
                    let index = closestNeighbors[id].index;
                    let xCoord = this.state.data[0].x[index];
                    let yCoord = this.state.data[0].y[index];
                    neighCoords[i] = [xCoord, yCoord];
                }
        
                this.setState({
                    mouseCoords: plotlyCoords,
                    neighborCoords: neighCoords
                })
    }

    /**
     * Given an object of neighbors and their index and distance, returns a label and latent representing a generated image
     * @param {ID: index, distance} neighbors - Int[] is array of obj ids, ?Float?[] are the distances to those,
     * of the closest neighbors to a click, where the number of neighbors taken  were decided earlier in the stack
     * @returns {label, latent} - the generated label and latent based on the neighbors
     */
    generateInterpSeed(neighbors) {
        const neighborIDs = Object.keys(neighbors);
        const numNeigh = neighborIDs.length;
        let sumDist = 0
        for (let i = 0; i < numNeigh; i++){
            sumDist = sumDist + neighbors[neighborIDs[i]].distance;
        }

        let totalLatent = Array.apply(null, Array(140)).map(Number.prototype.valueOf,0);
        let totalLabel = Array.apply(null, Array(1000)).map(Number.prototype.valueOf,0);;

        for (let i = 0; i < numNeigh; i++){
            let ratio = neighbors[neighborIDs[i]].distance/sumDist;
            let scaledLatent = this.scalarMultiplyVector(this.state.images[neighborIDs[i]].latents, ratio);
            let scaledLabel = this.scalarMultiplyVector(this.state.images[neighborIDs[i]].labels, ratio);
            totalLatent = this.addVector(totalLatent, scaledLatent);
            totalLabel = this.addVector(totalLabel, scaledLabel);
        }

        return {latent: totalLatent, label: totalLabel};
    }

    /**
     * adds two vectors of the same length together!
     * @param {Float[]} v1 - vector 1
     * @param {Float[]} v2 - vector 2
     */
    addVector(v1, v2){

        let sumVec = [];
        for (let i= 0; i< v1.length; i++){
            sumVec.push(v1[i]+v2[i])
        }

        return sumVec;
    }

    /**
     * Multiplies a vector by a scalar
     * @param {Float[]} vec 
     * @param {Float} scalar 
     */
    scalarMultiplyVector(vec, scalar){
        let newVec = [];
        for (let i= 0; i< vec.length; i++){
            newVec.push(vec[i]*scalar)
        }
        return newVec;
    }

    getNearestNeighbors(plotlyCoords, numClosest) {
        let xCoordsPlotly = this.state.data[0].x;
        let yCoordsPlotly = this.state.data[0].y;
        let distances = xCoordsPlotly.map((x, i) => {
            return this.calculateDistance([x, yCoordsPlotly[i]], plotlyCoords);
        });

        Array.min = function (array) {
            return Math.min.apply(Math, array);
        };
        let closestDistances = [0,0];
        let minVal = Array.min(distances);
        closestDistances[0] = minVal;
        let indexClosest1 = distances.indexOf(minVal);
        distances.splice(indexClosest1, 1);
        minVal = Array.min(distances);
        closestDistances[1] = minVal;
        let indexClosest2 = distances.indexOf(minVal);
        if (indexClosest1 <= indexClosest2) {
            indexClosest2 = indexClosest2 + 1;
        }
        let indices = [indexClosest1, indexClosest2];
        return [indices, closestDistances];
    }

    calculateDistance(coord1, coord2) {
        var a = coord1[0] - coord2[0];
        var b = coord1[1] - coord2[1];
        return Math.sqrt(a * a + b * b);
    }

    /* 
     * Takes in the pixel values of the div, and returns the coordinate
     * values in the plotly coordinate space
     */
    convertToRelativeCoords(x, y) {
        let relX = x - document.getElementById('plotlyBox').offsetLeft;
        let relY = y - document.getElementById('plotlyBox').offsetTop;
        let width = document.getElementById('plotlyBox').clientWidth + 8;
        let height = document.getElementById('plotlyBox').clientHeight + 8;

        relX = relX / width;
        relY = relY / height;
        return [relX, relY];
    }

     /* 
     * Converts our normalized (0->1) coords to a plotly data point coord
     */
    convertToPlotlyData(x, y) {
        const maxY = 1.3;
        const maxX = 1.3;
        const minY = 0.1;
        const minX = 0.1;

        let plotlyX = x * (maxX - minX) + minX;
        let plotlyY = (1.0 - y) * (maxY - minY) + minY;// + 0.011;
        return [plotlyX, plotlyY];
    }

    /* 
     * When an art piece is hovered over, the information should be displayed:
     * title, creator, date, etc (show link to explore similar?)
     */
    handleHover(eventData) {
        //console.log("HOVER DETECTED!");
        //console.log(eventData);
    }
}