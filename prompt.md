I want to create a website that tracks what could be improved in my town
("Stadtverbessserungskarte"). The town in question is Immenstadt i. Allgäu. 

The project is affiliated with the local association of Bündnis 90/Die Grünen,
but shall be an independent website. 

## Main functionality

The central piece of the website shall be a map that shows items in different layers that can be
activated. For the first version, there shall be two layers, but more may be
added in the future: 

 * Radverkehr 
 * Klimafolgenanpassung

In each layer, items shall be dispayed on the map as pins. By clicking on an
item, a page with details shall open (see below). 

## Additional 'graph' for Radverkehr layer

In addition to the main functionality, this layer shall have special
functionality. It shall display a graph, where each "Ortsteil" is a node 
and each edge is a connection between adjacent Ortsteile. The edge shall
be colored according to the safety of the bike connection between the two
locations (safe, medium, unsafe).

Add a legend. 

Find all "Ortsteile" of Immenstadt and initialize the graph. Store the graph as
JSON. I'll manually add the quality of the bike connections to that file. 

## Layout

### Base layout
Inspired by google maps on android

 - Navbar on top, hamburger on the right on mobile. 
 - Below, show the layers as chips with icon and text. The container should
   scroll horizontally if the chips extend beyond the screen (like the "Work",
   "Restaurants", ... menu in Google Maps on android)
 - Then, the map as the main display item
 - At the bottom an "explore" panel as in google maps on android. It shall show
   the "after" images of different items. One can scroll to the right to see more images.
   One can swipe up to increase the size of the panel. Mimick the behavior of
   google maps here. When clicking on an image, center the map at that position
   and open the corresponding item. When hovering over an item, highlight it on
   the map. 
 - Below, a footer displaying copyright notices and a link to the Impressum
   (Impressum as dead link for now, will be added later)

### When opening an item on the map

 - on mobile, full page view with a back button in navbar
 - on desktop/ipad -> open panel to the right side

The heartpiece of an item is a before and after photo. The
after photo will be an AI-edited version of the "before" photo picturing the
improvement. I imagine both pictures being displayed as overlay, by horizontally
swiping a slider over them one can view one or the other image. by default the
slider is placed in the middle, such that one can see half of the before and
half of the after image. 

Below comes a text description of the suggested improvement.

### Additional pages

(linked in the navbar)

 - Info -> standalone page within the site. Shall contain info about the
   project. Compile from markdown. I'll fill it manually later, put placeholder
   text for now. 
 - Idee einrichen -> standalone page, with contact info. Compile from markdown,
   put placeholder. 
 - Grüne Immenstadt -> dead link to gruene-immenstadt.de
 - Grüne Oberallgäu -> link to gruene-oa.de

## Data model

Use JSON. Also create a JSON schema that can be used to validate entries.
Store images statically as image files and link them from the JSON. 
Entries for the schema: 

 - Title
 - Location (coordinates)
 - layers, enum. each item can be displayed in multiple layers
 - images: {"before": ..., "after": ...}
 - description: text
 - author: text

For developing the app, create a couple of placeholder entries. Also create
placeholder images for "before" and "after". 

## Tech stack and design principles

 * the page should follow state-of-the-art accessibility
 * reactive layout - mobile first, but 1st class desktop support
 * static site - hosted on github pages or similar
 * use openlayers for the map
 * use the vite framework
 * do not reinvent the wheel. always prefer to use existing libraries over
   reimplementing functionality. 
 * keep it simple

