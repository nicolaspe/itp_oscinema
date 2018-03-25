// threejs variables
let container, renderer, camera, scene;
let controls, loader;
var mouse, raycaster;
var all_objects;
// raycaster tracking
var tracking = true;
var sphere_tracker;
// mlab variables
let curr_user = "nico";
let apiKey, db, coll;
let num_objects = 0;

window.addEventListener('load', onLoad);

// onLoad INITIALIZATION
function onLoad(){
  // THREEjs INITIALIZATION
	container = document.querySelector('#sketch');
	let wid = window.innerWidth;
	let hei = window.innerHeight;
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(wid, hei);
	container.appendChild(renderer.domElement);
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x101010 );
	camera = new THREE.PerspectiveCamera(80, wid/hei, 0.1, 8000);
	camera.position.set(0, 0, 10);
	controls = new THREE.OrbitControls( camera );
	controls.update();
	loader = new THREE.TextureLoader();

  // more INITIALIZATION
  all_objects = [];
  mouse = new THREE.Vector2();
  raycaster = new THREE.Raycaster();

  // ELEMENTS INITIALIZATION
  createEnvironment();
  loadObjects();

  // event listeners
	window.addEventListener('resize', onWindowResize, true );
  window.addEventListener('mousemove', onMouseMove, false);
  $("#sketch").on("drop", onDrop);
  $("#sketch").on("dragenter dragstart dragend dragleave dragover drag drop", function(e){
    e.preventDefault();
    // get the mouse position in normalized coordinates
    mouse.x =  (e.clientX / window.innerWidth) *2 -1;
    mouse.y = -(e.clientY / window.innerHeight)*2 +1;
    raycasting();
  });

	animate();
}
// EVENT FUNCTIONS
function onWindowResize(){
  let wid = window.innerWidth;
  let hei = window.innerHeight;

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(wid, hei);
	camera.aspect = wid/hei;
  camera.updateProjectionMatrix();
}
function onMouseMove( event ) {
  // mouse position in normalized coordinates
  mouse.x =  (event.clientX / window.innerWidth) *2 -1;
  mouse.y = -(event.clientY / window.innerHeight)*2 +1;
}
function onDrop( event ){
  // get the URL of the object dropped and with regex get the "correct" value
  let url_raw = event.originalEvent.dataTransfer.getData('text/html');
  let regex_url = /(((http|https?):\/\/)[\-\w@:%_\+.~#?,&\/\/=]+)|((mailto:)?[_.\w-]+@([\w][\w\-]+\.)+[a-zA-Z]{2,3})/g;
  let url = regex_url.exec(url_raw)[0];

  // get the mouse position in normalized coordinates
  mouse.x =  (event.clientX / window.innerWidth) *2 -1;
  mouse.y = -(event.clientY / window.innerHeight)*2 +1;
  // get raycaster position
  raycaster.setFromCamera( mouse, camera );
  // calc target position
  pos_x = raycaster.ray.origin.x + raycaster.ray.direction.x *50;
  pos_y = raycaster.ray.origin.y + raycaster.ray.direction.y *50;
  pos_z = raycaster.ray.origin.z + raycaster.ray.direction.z *50;

  // create a new object with the new image!
  let obj_id = "ws" + num_objects;
  createObject(obj_id, url, pos_x, pos_y, pos_z, -1, -1, true);
}


// ANIMATION
function animate() {
  // RAYCASTER
  raycasting();

	controls.update();
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}
function raycasting(){
  // set raycaster
  raycaster.setFromCamera( mouse, camera );
  // get intersecting elements
  let intersects = raycaster.intersectObjects( scene.children );
  // return all elements scale
  for (let i = 0; i < scene.children.length; i++) {
    scene.children[i].scale.set(1.0, 1.0, 1.0);
  }
  // "highlight" by scalig intersected elements
  for (let i = 0; i < intersects.length; i++) {
    intersects[i].object.scale.set(1.1, 1.1, 1.1);
  }

  // raycaster tracking
  if( tracking ) {
    pos_x = raycaster.ray.origin.x + raycaster.ray.direction.x *50;
    pos_y = raycaster.ray.origin.y + raycaster.ray.direction.y *50;
    pos_z = raycaster.ray.origin.z + raycaster.ray.direction.z *50;
    sphere_tracker.position.set( pos_x, pos_y, pos_z );
  }
}


// OBJECT FUNCTIONS
function createObject(id, url, posX, posY, posZ, wid, hei, is_new){
  // augment counter
  num_objects++;

  // create new object for array
  let new_obj = {};
  new_obj.id  = id;
  new_obj.url = url;
  new_obj.x   = posX;
  new_obj.y   = posY;
  new_obj.z   = posZ;

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
}
function saveObject( obj ){
  // add user data
  obj.user = curr_user;
  // parse data
  let data = JSON.stringify( obj );
  // create the query
  let query = "q=" +JSON.stringify({ _id: obj.id }) + "&";
  // send to mlab db
  $.ajax({
    url: "https://api.mlab.com/api/1/databases/" + CONFIG.MLAB_DB + "/collections/" + CONFIG.MLAB_COL + "/?" + query + "u=true&apiKey=" + CONFIG.MLAB_API,
    data: data,
    type: "PUT",
    contentType: "application/json",
    success: function(data){ console.log("object saved");   },
    fialure: function(data){ console.log("ERR, not saved"); },
  });
}
function loadObjects(){
  // flush current list
  for (let i = 0; i < all_objects.length; i++) {
    all_objects[i].remove();
  }
  // get all the elements for the current user
  let this_user = curr_user;
  let query = JSON.stringify( {user: this_user} );
  // ask the db for the thingies!
  $.ajax({
    url: "https://api.mlab.com/api/1/databases/" + CONFIG.MLAB_DB + "/collections/" + CONFIG.MLAB_COL + "/?q=" + query + "&apiKey=" + CONFIG.MLAB_API,
    type: "GET",
    contentType: "application/json",
    // create each object we get
    success: function(data){
      console.log(data);
      $.each(data, function(index, obj){
        createObject(obj.id, obj.url, obj.x, obj.y, obj.z, obj.wid, obj.hei, false);
      });
    }
  });
}


// ENVIRONMENT
function createEnvironment(){
	// SKYDOME
	let sky_geo = new THREE.SphereGeometry(500, 24, 24);
	// let sky_map = loader.load("https://raw.githubusercontent.com/ITPNYU/open-source-cinema/master/osc_setting/ruin.jpg");
	let sky_map = loader.load("pano/PANO_montreal.jpg");
	let sky_mat = new THREE.MeshBasicMaterial({
		map: sky_map,
		side: THREE.DoubleSide,
		// wireframe: true,
	});
	var skydome = new THREE.Mesh(sky_geo, sky_mat);
	scene.add(skydome);

  // tracker sphere
  let tr_geo = new THREE.SphereGeometry(0.3, 4, 4);
  let tr_mat = new THREE.MeshBasicMaterial({
    color: 0xf998b0,
  });
  sphere_tracker = new THREE.Mesh(tr_geo, tr_mat);
  if(tracking){ scene.add(sphere_tracker); }


	// LIGHTS!
	let d_light = new THREE.DirectionalLight(0xffffff, 1);
	scene.add(d_light);

	let p_light = new THREE.PointLight(0xff0000, 1.5, 1000, 2);
	p_light.position.set(0, -100, -100);
	scene.add(p_light);
}
