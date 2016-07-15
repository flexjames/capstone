"use strict"
var fsp = require('fs-promise');
var rootPathArray = __dirname.split("server/app/routes/data");
var rootPath=rootPathArray[0]

let idObject={person:"steve"};

var createTemplate = function(idObject){

  let templatePath=rootPath+ '/browser/js/viewer/view.html';

  //` hello ${idObject.person}`;

  let template= `
<div class="container">
<a ng-click="scrollTo('textelements')">Text Elements</a> |
<a ng-click="scrollTo('webelems')">Web & Multimedia</a>|
<a ng-click="scrollTo('datavis')"> Data Visualization</a>|
<a ng-click="scrollTo('network')">Network Graphs</a>|
<a ng-click="scrollTo('linear')">Linear Charts & Plots</a>|
<a ng-click="scrollTo('tree')">Tree Hierarchies</a>
<div class="ds-category">
  <h2> Page Attributes</h2>
    <div class="ds-sub-category">
          <h3><span id="textelements"> Text Elements </span></h3>
            <div class="row d_store">
              <div class= "col col-md-6 ds-browser-demo">
                  <title_subtitle ai_title="Page Title" ai_subtitle="It's gonna be great"></title_subtitle>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                <h4> Page Title </h4>
                <p> Go ahead, give that page a title!</p>

              </div>
            </div>
            <hr>

            <div class="row d_store">
              <div class= "col col-md-6 ds-browser-demo">
                  <ai_blockquote ai_quote="These charts are awesome" ai_person="Edward Tufte"></ai_blockquote>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                 <h4> Block Quote </h4>
                <p> Hopefully a famous person said something great about you</p>

              </div>
            </div>
            <hr>

            <div class="row d_store">
              <div class= "col col-md-6 ds-browser-demo">
                  <section_text ai_title="Informational Text" ai_text="Chambray iPhone bushwick, irony gastropub keffiyeh semiotics. Bushwick 90's cray, brooklyn helvetica cold-pressed retro cardigan cronut iPhone fanny pack. Fashion axe narwhal asymmetrical, selvage tacos celiac poutine meggings blue bottle authentic selfies shoreditch. Irony green juice fingerstache flexitarian, pork belly brooklyn locavore pabst mustache seitan."></section_text>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                 <h4> Section Text </h4>
                <p> Sometimes you've got to spell it out for them...</p>

              </div>
            </div>
            <hr>
    </div> <!-- end sub cat -->
    <div class="ds-sub-categoty">
          <h3 id="webelems"> Web & Multimedia Elements </h3>
          <div class="row d_store">

              <div class= "col col-md-6 ds-browser-demo">
                  <ai_click_img
                  ai_height="200"
                  ai_width="400"
                  ai_img_url="http://www.placebear.com/400/200"
                  ai_link="http://www.placebear.com/400/200"
                  bordertype="solid"
                  bordercolor="black"
                  borderweight="2px"
                  ></ai_click_img>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                <h4> Clickable Image</h4>
                <p> An image with a clickable link.</p>

              </div>
          </div>
          <hr>

          <div class="row d_store">
              <div class= "col col-md-6 ds-browser-demo">
                  <user_profile
                  ai_height="200"
                  ai_width="200"
                  ai_img_url="https://www.purlew.com/content/images/profile_placeholder.png"
                  round="true"
                  ai_name="Eric Katz"
                  ai_title="The Professor"
                  ai_profile="I like two things, teachin code and drinking beers. Looks to me like you already code pretty good."
                  ></user_profile>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                <h4> Personal Profile</h4>
                <p> Add your profile photo and a short description.</p>

              </div>
          </div>
          <hr>

          <div class="row d_store">
              <div class= "col col-md-6 ds-browser-demo">
                  <ai_social
                  ai_header= "Say Hello!"
                  ai_text="so many ways to connect:"
                  ai_facebook="https://www.facebook.com/"
                  ai_twitter="https://www.twitter.com"
                  ai_github="https://www.github.com"
                  ai_insta="https://www.instagram.com"
                  ></ai_social>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                <h4> Social Widget</h4>
                <p> Add your social media contact info</p>

              </div>
          </div>
          <hr>

</div> <!-- end cat -->
<div id="datavis" class="ds-category">
  <h2> Data Visualization</h2>
    <div class="ds-sub-category">
      <h3 id="network"> Network Graphs </h3>

          <div class="row d_store">
              <div class= "col col-md-6 ds-browser-demo">
                  <d3_force_basic
                  ai_title= "Basic Force Graph"
                  ai_height = "400"
                  ai_width = "400"
                  node_width = "5"
                  ai_info_source="${idObject.d3_force_basic}"
                  ></d3_force_basic>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                <h4> Basic D3 Network Force Graph</h4>
                <p> This simple network diagram is based off Ray Villalobos's d3 tutorial. The key difference between this graph and the others in our directive store is that it takes one data file, instead of a separate file for nodes and edges. Here, the edges are represented by the "target" property of the node. </p>

                <div class="well data-view">
                <pre>
{"nodes":[
{"name": "Grandpa Jones"},
{"name": "Papa Jim","target":[0]},
{"name": "Jane"},
{"name": "Jim Jr", "target":[1,2]},
{"name": "Big Steve", "target":[1,2]},
{"name": "Lil J", "target":[2,1]},
{"name": "That other kid"}
]}
  </pre>
  </div>

              </div>
          </div>
          <hr>

          <div class="row d_store">
              <div class= "col col-md-6 ds-browser-demo">
                  <d3_bostock_force
                  ai_title= "Bostock's Network Force Example"
                  ai_height = "400"
                  ai_width = "400"
                  node_width = "5"
                  labels="false"
                  colorSet="20"
                  ai_info_node_source="${idObject.d3_bostock_force_node}"
                  ai_info_edge_source="${idObject.d3_bostock_force_edge}"
                  ></d3_bostock_force>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                <h4> D3 Force Network Graph - Bostock Example</h4>
                <p> This force network graph is based off this <a href="https://bl.ocks.org/mbostock/4062045">example</a> from Mike Bostock. To supply your own data, provide an array of nodes and an array of edges. Note that the edges reference the nodes by their index position in the array.</p>

                 Sample Nodes:
                 <div class="well data-view">
                  <pre>
[
    {"name":"Myriel","group":1},
    {"name":"Napoleon","group":1},
    {"name":"Mlle.Baptistine","group":1},
    {"name":"Mme.Magloire","group":1},
    {"name":"CountessdeLo","group":1},
    {"name":"Geborand","group":1},
    {"name":"Champtercier","group":1},
    {"name":"Cravatte","group":1},
    {"name":"Count","group":1},
    {"name":"OldMan","group":1},
    {"name":"Labarre","group":2},
    {"name":"Valjean","group":2},
    {"name":"Marguerite","group":3},
    {"name":"Mme.deR","group":2},
    {"name":"Isabeau","group":2},
    {"name":"Gervais","group":2},
    {"name":"Tholomyes","group":3},
    {"name":"Listolier","group":3},
    {"name":"Fameuil","group":3},
    {"name":"Blacheville","group":3},
    {"name":"Favourite","group":3},
    {"name":"Dahlia","group":3},
    ...
                  </pre>
                </div>

                 Sample Edges:
                 <div class="well data-view">
                  <pre>
[
    {"source":1,"target":0,"value":1},
    {"source":2,"target":0,"value":8},
    {"source":3,"target":0,"value":10},
    {"source":3,"target":2,"value":6},
    {"source":4,"target":0,"value":1},
    {"source":5,"target":0,"value":1},
    {"source":6,"target":0,"value":1},
    {"source":7,"target":0,"value":1},
    {"source":8,"target":0,"value":2},
    {"source":9,"target":0,"value":1},
    {"source":11,"target":10,"value":1},
    {"source":11,"target":3,"value":3},
    {"source":11,"target":2,"value":3},
    {"source":11,"target":0,"value":5},
    {"source":12,"target":11,"value":1},
    {"source":13,"target":11,"value":1},
    {"source":14,"target":11,"value":1},
    {"source":15,"target":11,"value":1},
    {"source":17,"target":16,"value":4},
    {"source":18,"target":16,"value":4},
    {"source":18,"target":17,"value":4},
    {"source":19,"target":16,"value":4},
    {"source":19,"target":17,"value":4},
    {"source":19,"target":18,"value":4},
    {"source":20,"target":16,"value":3},
    ...
                  </pre>
                </div>

              </div>
          </div>
          <hr>

          <div class="row d_store">
              <div class= "col col-md-6 ds-browser-demo">
                  <d3_force_images
                  ai_title= "Network Force Graph with Node Images"
                  ai_height = "400"
                  ai_width = "400"
                  bcolor= "white"
                  ai_info_node_source="${idObject.d3_force_images_node}"
                  ai_info_edge_source="${idObject.d3_force_images_edge}"
                  ></d3_force_images>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                <h4> Network Force Graph with Node Images</h4>
                <p> This force network graph is based off this <a href="https://bl.ocks.org/mbostock/950642">example</a> from Mike Bostock. Here, the nodes are represented as images. In order to use this directive, add an image url on the "image" property of the node object. </p>
                <p>The edge data in this data set also contains a value or weight to indicate the strength of the connection between the nodes.</p>
                  Sample Nodes:
                 <div class="well data-view">
                  <pre>
[
  {
    "id": "s01",
    "name": "NY Times",
    "group": 1,
    "type.label": "Newspaper",
    "audience.size": 20,
    "image":"https://s-media-cache-ak0.pinimg.com/736x/c4/81/1d/c4811d59c17568b2ea75b1327d0dfc9e.jpg"
  },
  {
    "id": "s02",
    "name": "Washington Post",
    "group": 1,
    "type.label": "Newspaper",
    "audience.size": 25,
    "image":"https://www.washingtonpost.com/favicon.ico"
  },
  {
    "id": "s03",
    "name": "Wall Street Journal",
    "group": 1,
    "type.label": "Newspaper",
    "audience.size": 30,
    "image":"http://pbs.twimg.com/profile_images/685113343204585473/jV72Zljq_reasonably_small.jpg"

  },

]
                  </pre>
                </div>

                 Sample Edges:
                 <div class="well data-view">
                  <pre>
[
  {
    "source": 0,
    "target":1,
    "value": 10,
    "type": "hyperlink"
  },
  {
    "source": 0,
    "target": 1,
    "value": 12,
    "type": "hyperlink"
  },
  {
    "source": 0,
    "target": 2,
    "value": 22,
    "type": "hyperlink"
  },
  {
    "source": 0,
    "target": 3,
    "value": 21,
    "type": "hyperlink"
  },
  {
    "source": 3,
    "target": 10,
    "value": 22,
    "type": "mention"
  },
  {
    "source": 4,
    "target": 14,
    "value": 21,
    "type": "mention"
  },
                  </pre>
                </div>

              </div>
          </div>
          <hr>
    </div> <!-- end sub cat -->
  <div class="ds-sub-category">
      <h3 id="linear"> Linear Charts & Plots </h3>

          <div class="row d_store">
              <div class= "col col-md-6 ds-browser-demo">
                  <nvd3_bar_chart
                  ai_title= "Corporate Profits"
                  ai_height = "400"
                  ai_width = "400"
                  key="Profits"
                  label="Ticker"
                  yvalue="2014"
                  ai_info_source="${idObject.nvd3_bar_chart}"
                  ></nvd3_bar_chart>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                <h4> Discrete Bar Chart</h4>
                <p> Powered by the NVD3 library. The discrete bar charts is a good choice for comparing one dimensional data across several entities. In this case, we are comparing yearly profits (y axis) across the top earning companies in the US (spread across the x axis). You can toggle the data attribute informing the Y axis in the directive options.</p>

                <div class="well data-view">
                  <pre>"Ticker","Company","2014","2013","2012","2011","2010","2009","2008"
"AAPL","Apple Inc.","39,510","37,037","41,733","25,922","14,013","8,235","6,119"
"AXP","American Express Inc.","5,885","5,359","4,482","4,935","4,057","2,130","2,699"
"BA","Boeing Co.","5,446","4,585","3,900","4,018","3,307","1,312","2,672"
"CAT","Caterpillar Inc.","3,695","3,789","5,681","4,928","2,700","895","3,557"
"CSCO","Cisco Systems","7,853","9,983","8,041","6,490","7,767","6,134","8,052"
"CVX","Chevron","19,241","21,423","26,179","26,895","19,024","10,483","23,931"
"DD","DuPont","3,625","4,848","2,755","3,474","3,031","1,755","2,007"
"DIS","The Walt Disney Co.","7,501","6,136","5,682","4,807","3,963","3,307","4,427"
"GE","General Electric Co.","15,233","13,057","13,641","14,151","11,644","11,025","17,410"
"GS","Goldman Sachs","8,477","8,040","7,475","4,442","8,354","13,385","2,322"
"HD","Home Depot","5,385","4,535","3,883","3,338","2,661","2,260","4,395"
"IBM","IBM","12,022","16,483","16,604","15,855","14,833","13,425","12,334"
"INTC","Intel Corp.","11,704","9,620","11,005","12,942","11,464","4,369","5,292"
"JNJ","Johnson & Johnson Inc.","16,323","13,831","10,853","9,672","13,334","12,266","12,949"
"JPM","JP Morgan Chase & Co.","21,762","17,923","21,284","18,976","17,370","11,728","5,605"
"KO","The Coca-Cola Co.","7,098","8,584","9,019","8,584","11,787","6,824","5,807"
"MCD","McDonald's Corp.","4,758","5,586","5,465","5,503","4,946","4,551","4,313"
"MMM","3M Co.","4,956","4,659","4,444","4,283","4,085","3,193","3,460"
"MRK","Merck & Co.","11,920","4,404","6,168","6,272","861","12,899","7,808"
"MSFT","Microsoft","22,074","21,863","16,978","23,150","18,760","14,569","17,681"
"NKE","Nike","2,693","2,472","2,223","2,133","1,907","1,487","1,883"
"PFE","Pfizer Inc.","9,135","22,003","14,570","10,009","8,257","8,635","8,104"
"PG","Procter & Gamble Co.","11,643","11,312","10,756","11,797","12,736","13,436","12,075"
"TRV","Travelers Companies","3,692","3,673","2,473","1,426","3,216","3,622","2,924"

                  </pre>
                </div>


              </div>
          </div>
          <hr>
        <div class="row d_store">
              <div class= "col col-md-6 ds-browser-demo">
                  <nvd3_scatter_chart
                    ai_title= "Iris Petal Width vs Length"
                    ai_height = "400"
                    ai_info_source="${idObject.nvd3_scatter_chart}"
                    xvalue="petalLength"
                    yvalue= "petalWidth"
                    size="sepalLength"
                    label="species"
                  ></nvd3_scatter_chart>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                <h4> Interactive Scatter Plot</h4>
                <p> Powered by the NVD3 library. The scatter plot is a good option for displaying data with multiple dimentions - in this case the petal width,petal height, and sepal length of the famous Iris data </p>
                <p> By using the size and color of the points (sepal length and species type respectively) we are able to communicate a large amount of information in a small space. The interactive nature of this NVD3 directive lets users focus in on specific dimensions of the data. </p>

                <div class="well data-view">
                  <pre>id,value
sepal_length,sepal_width,petal_length,petal_width,species
5.1,3.5,1.4,0.2,setosa
4.9,3,1.4,0.2,setosa
4.7,3.2,1.3,0.2,setosa
4.6,3.1,1.5,0.2,setosa
5,3.6,1.4,0.2,setosa
5.4,3.9,1.7,0.4,setosa
4.6,3.4,1.4,0.3,setosa
5,3.4,1.5,0.2,setosa
4.4,2.9,1.4,0.2,setosa
4.9,3.1,1.5,0.1,setosa
5.4,3.7,1.5,0.2,setosa
4.8,3.4,1.6,0.2,setosa
4.8,3,1.4,0.1,setosa
4.3,3,1.1,0.1,setosa
5.8,4,1.2,0.2,setosa
5.7,4.4,1.5,0.4,setosa
5.4,3.9,1.3,0.4,setosa
5.1,3.5,1.4,0.3,setosa
5.7,3.8,1.7,0.3,setosa
5.1,3.8,1.5,0.3,setosa
5.4,3.4,1.7,0.2,setosa
5.1,3.7,1.5,0.4,setosa
4.6,3.6,1,0.2,setosa
5.1,3.3,1.7,0.5,setosa
4.8,3.4,1.9,0.2,setosa
5,3,1.6,0.2,setosa
5,3.4,1.6,0.4,setosa
5.2,3.5,1.5,0.2,setosa
5.2,3.4,1.4,0.2,setosa
4.7,3.2,1.6,0.2,setosa
4.8,3.1,1.6,0.2,setosa
5.4,3.4,1.5,0.4,setosa
5.2,4.1,1.5,0.1,setosa
5.5,4.2,1.4,0.2,setosa
4.9,3.1,1.5,0.1,setosa
5,3.2,1.2,0.2,setosa
5.5,3.5,1.3,0.2,setosa
4.9,3.1,1.5,0.1,setosa
4.4,3,1.3,0.2,setosa
5.1,3.4,1.5,0.2,setosa
5,3.5,1.3,0.3,setosa
4.5,2.3,1.3,0.3,setosa
4.4,3.2,1.3,0.2,setosa
5,3.5,1.6,0.6,setosa
5.1,3.8,1.9,0.4,setosa
4.8,3,1.4,0.3,setosa
5.1,3.8,1.6,0.2,setosa
4.6,3.2,1.4,0.2,setosa
5.3,3.7,1.5,0.2,setosa
5,3.3,1.4,0.2,setosa
7,3.2,4.7,1.4,versicolor
6.4,3.2,4.5,1.5,versicolor
6.9,3.1,4.9,1.5,versicolor
5.5,2.3,4,1.3,versicolor
6.5,2.8,4.6,1.5,versicolor
5.7,2.8,4.5,1.3,versicolor
6.3,3.3,4.7,1.6,versicolor
4.9,2.4,3.3,1,versicolor
6.6,2.9,4.6,1.3,versicolor
5.2,2.7,3.9,1.4,versicolor
5,2,3.5,1,versicolor
5.9,3,4.2,1.5,versicolor
6,2.2,4,1,versicolor
6.1,2.9,4.7,1.4,versicolor
5.6,2.9,3.6,1.3,versicolor
6.7,3.1,4.4,1.4,versicolor
5.6,3,4.5,1.5,versicolor
5.8,2.7,4.1,1,versicolor
6.2,2.2,4.5,1.5,versicolor
5.6,2.5,3.9,1.1,versicolor
5.9,3.2,4.8,1.8,versicolor
6.1,2.8,4,1.3,versicolor
6.3,2.5,4.9,1.5,versicolor
6.1,2.8,4.7,1.2,versicolor
6.4,2.9,4.3,1.3,versicolor
6.6,3,4.4,1.4,versicolor
6.8,2.8,4.8,1.4,versicolor
6.7,3,5,1.7,versicolor
6,2.9,4.5,1.5,versicolor
5.7,2.6,3.5,1,versicolor
5.5,2.4,3.8,1.1,versicolor
5.5,2.4,3.7,1,versicolor
5.8,2.7,3.9,1.2,versicolor
6,2.7,5.1,1.6,versicolor
5.4,3,4.5,1.5,versicolor
6,3.4,4.5,1.6,versicolor
6.7,3.1,4.7,1.5,versicolor
6.3,2.3,4.4,1.3,versicolor
5.6,3,4.1,1.3,versicolor
5.5,2.5,4,1.3,versicolor
5.5,2.6,4.4,1.2,versicolor
6.1,3,4.6,1.4,versicolor
5.8,2.6,4,1.2,versicolor
5,2.3,3.3,1,versicolor
5.6,2.7,4.2,1.3,versicolor
5.7,3,4.2,1.2,versicolor
5.7,2.9,4.2,1.3,versicolor
6.2,2.9,4.3,1.3,versicolor
5.1,2.5,3,1.1,versicolor
5.7,2.8,4.1,1.3,versicolor
6.3,3.3,6,2.5,virginica
5.8,2.7,5.1,1.9,virginica
7.1,3,5.9,2.1,virginica
6.3,2.9,5.6,1.8,virginica
6.5,3,5.8,2.2,virginica
7.6,3,6.6,2.1,virginica
4.9,2.5,4.5,1.7,virginica
7.3,2.9,6.3,1.8,virginica
6.7,2.5,5.8,1.8,virginica
7.2,3.6,6.1,2.5,virginica
6.5,3.2,5.1,2,virginica
6.4,2.7,5.3,1.9,virginica
6.8,3,5.5,2.1,virginica
5.7,2.5,5,2,virginica
5.8,2.8,5.1,2.4,virginica
6.4,3.2,5.3,2.3,virginica
6.5,3,5.5,1.8,virginica
7.7,3.8,6.7,2.2,virginica
7.7,2.6,6.9,2.3,virginica
6,2.2,5,1.5,virginica
6.9,3.2,5.7,2.3,virginica
5.6,2.8,4.9,2,virginica
7.7,2.8,6.7,2,virginica
6.3,2.7,4.9,1.8,virginica
6.7,3.3,5.7,2.1,virginica
7.2,3.2,6,1.8,virginica
6.2,2.8,4.8,1.8,virginica
6.1,3,4.9,1.8,virginica
6.4,2.8,5.6,2.1,virginica
7.2,3,5.8,1.6,virginica
7.4,2.8,6.1,1.9,virginica
7.9,3.8,6.4,2,virginica
6.4,2.8,5.6,2.2,virginica
6.3,2.8,5.1,1.5,virginica
6.1,2.6,5.6,1.4,virginica
7.7,3,6.1,2.3,virginica
6.3,3.4,5.6,2.4,virginica
6.4,3.1,5.5,1.8,virginica
6,3,4.8,1.8,virginica
6.9,3.1,5.4,2.1,virginica
6.7,3.1,5.6,2.4,virginica
6.9,3.1,5.1,2.3,virginica
5.8,2.7,5.1,1.9,virginica
6.8,3.2,5.9,2.3,virginica
6.7,3.3,5.7,2.5,virginica
6.7,3,5.2,2.3,virginica
6.3,2.5,5,1.9,virginica
6.5,3,5.2,2,virginica
6.2,3.4,5.4,2.3,virginica
5.9,3,5.1,1.8,virginica
                  </pre>
                </div>

              </div>
          </div>
          <hr>

          <div class="row d_store">
              <div class= "col col-md-6 ds-browser-demo">
                  <pie_graph_user_input
                    ai_title= "People's Pie Chart"
                    ai_height= "200"
                    ai_width= "200"
                    ai_radius= "100"
                    label1="Steve"
                    value1="40"
                    label2="Bob"
                    value2="60"
                    label3="Jen"
                    value3=35
                    label4="Amy"
                    value4="30"
                    label5="Sue"
                    value5="80"
                  ></pie_graph_user_input>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                <h4> Pie Chart with User Input</h4>
                <p> This simple chart is noteworthy in that it you can use it without providing a data set; simply enter your labels and values directly in the editor</p>

                <div class="well data-view">
                  <pre>
label1="Steve"
value1="40"
label2="Bob"
value2="60"
label3="Jen"
value3=35
label4="Amy"
value4="30"
label5="Sue"
value5="80"
                  </pre>
                </div>

              </div>
          </div>
          <hr>
    </div> <!-- end sub cat -->

    <div class="ds-sub-category">
      <h3 id="tree"> Tree Hierarchies  </h3>

          <div class="row d_store">
              <div class= "col col-md-6 ds-browser-demo">
                  <flare_larskotthoff
                    ai_title= "Flare hierarchy"
                    ai_height = "400"
                    ai_width = "400"
                    ai_info_source="${idObject.flare_larskotthoff}"
                  ></flare_larskotthoff>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                <h4> Collapsable Panel Hierarchy</h4>
                <p> This plot is borrowed from Lar's HottHoff's <a href="http://bl.ocks.org/larskotthoff/7022289">example</a> The flat layout makes it a good choice for representing a nested set of data in a small space. </p>
                <p> Compare to the collapsible veritical and horizontal trees if space is a concern</p>

                <div class="well data-view">
                  <pre>id,value
flare,
flare.analytics,
flare.analytics.cluster,
flare.analytics.cluster.AgglomerativeCluster,3938
flare.analytics.cluster.CommunityStructure,3812
flare.analytics.cluster.HierarchicalCluster,6714
flare.analytics.cluster.MergeEdge,743
flare.analytics.graph,
flare.analytics.graph.BetweennessCentrality,3534
flare.analytics.graph.LinkDistance,5731
flare.analytics.graph.MaxFlowMinCut,7840
flare.analytics.graph.ShortestPaths,5914
flare.analytics.graph.SpanningTree,3416
flare.analytics.optimization,
flare.analytics.optimization.AspectRatioBanker,7074
flare.animate,
flare.animate.Easing,17010
flare.animate.FunctionSequence,5842
flare.animate.interpolate,
                  </pre>
                </div>

              </div>
          </div>
          <hr>

          <div class="row d_store">
              <div class= "col col-md-6 ds-browser-demo">
                  <horizontal_flare
                    ai_title= "Flare Data"
                    ai_height = "400"
                    ai_width = "400"
                    ai_info_source="${idObject.flare_larskotthoff}"
                  ></horizontal_flare>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                <h4> Horizontal Tree</h4>
                <p> This plot is borrowed from Mike Bostock's <a href="https://bl.ocks.org/mbostock/4339083">collapsable tree example</a></p>
                <p> Also works well with the sample roster data</p>
                csv data.
                Flare CSV (1st 20 lines):
                <div class="well data-view">
                  <pre>id,value
flare,
flare.analytics,
flare.analytics.cluster,
flare.analytics.cluster.AgglomerativeCluster,3938
flare.analytics.cluster.CommunityStructure,3812
flare.analytics.cluster.HierarchicalCluster,6714
flare.analytics.cluster.MergeEdge,743
flare.analytics.graph,
flare.analytics.graph.BetweennessCentrality,3534
flare.analytics.graph.LinkDistance,5731
flare.analytics.graph.MaxFlowMinCut,7840
flare.analytics.graph.ShortestPaths,5914
flare.analytics.graph.SpanningTree,3416
flare.analytics.optimization,
flare.analytics.optimization.AspectRatioBanker,7074
flare.animate,
flare.animate.Easing,17010
flare.animate.FunctionSequence,5842
flare.animate.interpolate,
                  </pre>
                </div>
              </div>
          </div>
          <hr>

          <div class="row d_store">
              <div class= "col col-md-6 ds-browser-demo">
                  <vert_flare
                    ai_title= "Roster Data"
                    ai_height = "400"
                    ai_width = "400"
                    ai_info_source="${idObject.vert_flare}"
                  ></vert_flare>
              </div>
              <div class= "col col-md-6 ds-long-desc">
                <h4> Collapsable Vertical Tree</h4>
                <p> This plot is borrowed from Mike Bostock's <a href="https://bl.ocks.org/mbostock/4339083">collapsable tree example</a></p>
                <p> Note that the text is staggered for the sake of visibility</p>
                <p> Data requires a defined root node with arrays of children nodes:</p>
                <div class="well data-view">
                  <pre>{"name":"Sample School","children":
                          [{"name":"Gregory","children":
                              [{"name":"aahoi-9-41","children":
                                  [{"name":"Strickland","children":
                                      [{"hdrid":1640712493,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"11263113779326","studentfirstname":"Stella","studentmiddlename":"Lura","studentlastname":"Strickland","studentphone":"5304461587","studentemailaddress":"jiwezsu@bomguwuf.co.uk","studentgender":"F","studentethnicity":"Other","studentdateofbirth":"20010704","studentaddress1":"869 Apdak Ave","studentaddress2":"Apt 9d","studentaddresscity":"Gakukoac","studentaddressstate":"NV","studentaddresszip":"30464","guardianphone":"9779059052","studentgradelevel":"9","sourcestudentusername":"b5693eb69d3f2321","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":0}]}...
                  </pre>
                </div>
              </div>
          </div>
          <hr>

  </div> <!-- end sub cat -->
</div> <!-- end cat -->

</div>

  `;



  return fsp.writeFile(templatePath, template);
}

module.exports=createTemplate;

