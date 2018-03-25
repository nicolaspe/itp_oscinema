function drop(ev) {
  //sucks the url out of what you dropped
  var data = ev.originalEvent.dataTransfer.getData('text/html');
  //use a regular expression to pull the url out of the the html for the thing they dropped
  var regexToken = /(((http|https?):\/\/)[\-\w@:%_\+.~#?,&\/\/=]+)|((mailto:)?[_.\w-]+@([\w][\w\-]+\.)+[a-zA-Z]{2,3})/g;
  var url = regexToken.exec(data)[0]; //returns array of all matches but you want the first
  //Creat a new object using our own object function'
  var elementID = "OSC_IMG_"+ numberOfElements;

  var img = new Image();
  img.addEventListener('load', function(){
    wid = img.width /2;
    hei = img.height /2;
    // console.log(wid + ' - ' + hei);
    newElement(elementID,url,mouseX,mouseY,wid,hei);
  });
  img.src = url;
}

function newElement(elementID,url,x,y,w,h){
  //called either by dropping or pulling in elements from the database
  numberOfElements++;
  var dom_element = createImg(url);
  if (w == -1){  //just dropped
    w = dom_element.size().width/2;  //pictures tend to be too big
    h = dom_element.size().height/2;
  }
  //deserialize info
  selectedElement = dom_element;
  dom_element.id(elementID);
  dom_element.position(x,y);
  dom_element.size(w, h);
  dom_element.mousePressed(function(){
    dragging = true;
    selectedElement = this;
  });
  dom_element.mouseMoved( function(){
    if(this == selectedElement && dragging == true){
      this.position(mouseX-this.width/2,mouseY-this.height/2);
    }
  });
  dom_element.mouseReleased(function(){
    dragging = false;
    saveIt(selectedElement);
  });
  //disable all the default drag events for this element.
  $('#'+elementID).on("dragenter dragstart dragend dragleave dragover drag drop", function (e) {
    e.preventDefault();
  });
  saveIt(dom_element);
  allElements.push(dom_element);
}
