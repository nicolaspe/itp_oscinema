# New Storytelling platforms

Starting the task of creating an open cinematic creation tool, where you can manipulate the elements on a scene and everything gets saved and loaded online, I decided to go ahead and use three.js. It is a package I'm very comfortable with, so step was not that much of a stretch.

The full exercise can be seen [here](http://138.197.122.214:1100/), and the code can be explored in the [GitHub repository](https://github.com/nicolaspe/itp_oscinema/tree/master/web_stories). This assignment expanded on the code from the class example, [found here](https://github.com/ITPNYU/open-source-cinema/tree/master/osc_collage_drop).

![example of the platform](lion_example.png)


### Raycasting
Before doing anything, it is crucial to realize that unlike the example, this 3D space has depth and a movable camera, which makes the object placement on the scene much more difficult. To solve this, I used threejs [raycaster](https://threejs.org/docs/#api/core/Raycaster), which tells you where the mouse is pointing according to the camera position and rotation.

This process has to be updated every time the mouse moves and whenever something is dragged and dropped inside the page (`mousemove`, `drop` and `dragenter dragstart dragend dragleave dragover drag` events). It uses normalized mouse coordinates and needs the threejs camera object. Finally, I add the direction to the origin, in order to place the object (or place the mouse tracker) at a distance from the camera.

```javascript
// get the mouse position in normalized coordinates
mouse.x =  (event.clientX / window.innerWidth) *2 -1;
mouse.y = -(event.clientY / window.innerHeight)*2 +1;
// get raycaster position
raycaster.setFromCamera( mouse, camera );
// calc target position or tracking pointer
pos_x = raycaster.ray.origin.x + raycaster.ray.direction.x *50;
pos_y = raycaster.ray.origin.y + raycaster.ray.direction.y *50;
pos_z = raycaster.ray.origin.z + raycaster.ray.direction.z *50;
```



### Dragging images
One of the key aspects of this assignment is being able to drag images from another web page into the scene.

First, I extracted the URL, using the same regular expression from the example. Then, I passed that string to the threejs `TextureLoader`, which processes the image when it loads (by writing that function as a callback). This image is placed on a plane with transparency and is saved to the server only if it's a new image (as this is the same function that loads the images when they're extracted from the server).  

```javascript
// get the URL of the object dropped and with regex get the "correct" value
let url_raw = event.originalEvent.dataTransfer.getData('text/html');
let regex_url = /(((http|https?):\/\/)[\-\w@:%_\+.~#?,&\/\/=]+)|((mailto:)?[_.\w-]+@([\w][\w\-]+\.)+[a-zA-Z]{2,3})/g;
let url = regex_url.exec(url_raw)[0];

/*
    [...]
*/

// load image and create element as callback
loader.load(url, function(texture){
  // create texture
  let plane_text = new THREE.MeshBasicMaterial({
    map: texture,  // load image from url
    side: THREE.DoubleSide,
    transparent: true,
  });
  // create geometry
  if(wid == -1 || new_obj){  // check if it's a new object (w = -1)
    wid = Math.floor( texture.image.width  /50 ); // scale
    hei = Math.floor( texture.image.height /50 ); // image
  }
  new_obj.wid = wid;
  new_obj.hei = hei;
  let plane_mesh = new THREE.PlaneGeometry(wid, hei, 2, 2);
  // create mesh
  let obj = new THREE.Mesh(plane_mesh, plane_text);
  // assign position
  obj.position.set( posX, posY, posZ );
  // add to scene
  scene.add(obj);

  // add to local list and db
  all_objects.push( new_obj );
  if( is_new ){ // only add to the db if it's a new element, and not loaded from the db
    saveObject( new_obj );
  }
});
```


### Next steps

The next steps for this experiment are:

1. Adding the possibility to rearrange the images
2. Adding the possibility to scale the images
3. Adding the possibility to delete the images
4. Adding support for new/different users (hopefully with a landing script)
5. Adding support for multiple scenes
6. Adding support for time animations and keyframing

There's a lot to do, but it excites me to see the possibilities of creating such a platform. At the same time, breaking it down in these steps, makes it much more manageable.
