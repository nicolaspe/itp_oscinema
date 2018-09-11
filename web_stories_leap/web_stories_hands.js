// threejs variables
let container, renderer, scene;
var camera;
let controls, loader;
let mouse, raycaster;
// raycaster tracking
let tracking = true;
let sphere_tracker;
let selected_obj;
let menu_on = false;
let menu_obj_on = false;
// leapmotion
let controller;
var baseBoneRotation;
var armMeshes, boneMeshes;
// mlab variables
let curr_user  = "default";
let curr_scene = 0;
let scene_objects = [];
let apiKey, db, coll;
let num_objects = 0;

window.addEventListener('load', init);

// onLoad INITIALIZATION
function init(){
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
	camera = new THREE.PerspectiveCamera(50, wid/hei, 0.1, 8000);
	camera.position.set(0, 0, 10);
	controls = new THREE.OrbitControls( camera );
	controls.update();
	loader = new THREE.TextureLoader();

  // more INITIALIZATION
  scene_objects = [];
  mouse = new THREE.Vector2();
  raycaster = new THREE.Raycaster();

	// LeapMotion INITIALIZATION
	baseBoneRotation = ( new THREE.Quaternion ).setFromEuler( new THREE.Euler( 0, 0, Math.PI / 2 ) );
	armMeshes = [];
	boneMeshes = [];

	controller = new Leap.loop( {background: true}, animate );
	controller.connect();

	controls = new THREE.LeapTwoHandControls( camera, controller );
	controls.translationSpeed   = 1.0;	// was 20
	controls.translationDecay   = 0.3;	// was 0.3
	controls.scaleDecay         = 0.5;	// was 0.5
	controls.rotationSlerp      = 0.4;	// was 0.8
	controls.rotationSpeed      = 0.8;	// was 4
	controls.pinchThreshold     = 0.3;	// was 0.5
	controls.transSmoothing     = 0.4;	// was 0.5
	controls.rotationSmoothing  = 0.2;	// was 0.2

	// GUI INITIALIZATION
	loadButtons();
	openMenu( document.querySelector("#menu_user") );
	document.getElementById("input_username").focus();

  // ELEMENTS INITIALIZATION
	updateControlLabels();
  createEnvironment();
	loadCamera( curr_scene );
  loadObjects( curr_scene );

  // event listeners
	window.addEventListener('resize', onWindowResize, true );
  window.addEventListener('mousemove', onMouseMove, false);
	$("#sketch").on("drop", onDrop);
	$("#sketch").on("click", onClick);
  $("#sketch").on("dragenter dragstart dragend dragleave dragover drag drop", function(e){
    e.preventDefault();
    // get the mouse position in normalized coordinates
    mouse.x =  (e.clientX / window.innerWidth) *2 -1;
    mouse.y = -(e.clientY / window.innerHeight)*2 +1;
    raycasting();
  });
	$("#sketch").on("mouseup", saveCamera);

	// animate();
}

function loadButtons(){
	// switch scene
	$("#button_scn_next").click(function(){
		changeScene(1);
	});
	$("#button_scn_prev").click(function(){
		changeScene(-1);
	});

	// change user
	$("#button_user").click(function(){
		// reset text box value
		$("#input_username").val("");
		// select object and open menu
		let user_menu = document.querySelector("#menu_user");
		openMenu(user_menu);
		menu_on = true;
		// and FOCUS on the menu
		document.getElementById("input_username").focus();
	});
	$("#button_user_x").click(function(){
		// reset text box value
		$("#input_username").val("");
		// select object and close menu
		let user_menu = document.querySelector("#menu_user");
		menu_on = false;
		closeMenu(user_menu);
	});
	$("#button_user_submit").click(function(){
		// get new username and set scene to 0
		curr_user = $("#input_username").val();
		curr_scene = 0;
		// update labels + load objects and camera
		updateControlLabels();
		loadObjects(0);
		loadCamera(0);
		// reset text box value
		$("#input_username").val("");
		// select object and close menu
		let user_menu = document.querySelector("#menu_user");
		menu_on = false;
		closeMenu(user_menu);
	});
}
function updateControlLabels(){
	$("#label_user").text( curr_user );
	$("#label_scene").text( curr_scene );
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
function onClick( event ){
	// this happens only if the camera can move => not in a menu
	if(!menu_on){
		// get the mouse position in normalized coordinates
	  mouse.x =  (event.clientX / window.innerWidth) *2 -1;
	  mouse.y = -(event.clientY / window.innerHeight)*2 +1;
	  // get raycaster position
	  raycaster.setFromCamera( mouse, camera );
		// get intersecting elements
		if( scene_objects.length > 0 ){
		  let intersects = raycaster.intersectObjects( scene_objects );
		  // get the first element
			if (intersects.length > 0 && !menu_on ){
				// assign object
				selected_obj = intersects[0].object;
				menu_object_on = true;
				openMenu( document.querySelector("#menu_object") );
				controls.enabled = false;
				// update object labels
				updateObjectLabels();
			} else {  // if we didn't click on anything, deselect
				// DEasign object
				selected_obj = null;
				menu_object_on = false;
				closeMenu( document.querySelector("#menu_object") );
				controls.enabled = true;
				// update object labels
				updateObjectLabels();
			}
		}
	}
	// ;
}
function updateObjectLabels(){
	if(selected_obj != null){	// check if we have an object
		$("#label_obj_name").text( selected_obj.id );
		$("#label_obj_posx").text( (selected_obj.position.x).toFixed(2) );
		$("#label_obj_posy").text( (selected_obj.position.y).toFixed(2) );
		$("#label_obj_posz").text( (selected_obj.position.z).toFixed(2) );
		$("#label_obj_rotx").text( (selected_obj.rotation.x).toFixed(2) );
		$("#label_obj_roty").text( (selected_obj.rotation.y).toFixed(2) );
		$("#label_obj_rotz").text( (selected_obj.rotation.z).toFixed(2) );
	} else {
		$("#label_obj_name").text( "" );
		$("#label_obj_posx").text( "" );
		$("#label_obj_posy").text( "" );
		$("#label_obj_posz").text( "" );
		$("#label_obj_rotx").text( "" );
		$("#label_obj_roty").text( "" );
		$("#label_obj_rotz").text( "" );
	}
	// ;
}

// BUTTON FUNCTIONS
function changeScene( i ){
	curr_scene += i;
	if( curr_scene < 0 ){ curr_scene = 0; }
	updateControlLabels();
	loadObjects( curr_scene );
	loadCamera( curr_scene );
}
function closeMenu( ref_menu ){
	menu_on = false;
	controls.enabled = true;
	ref_menu.style.visibility = "hidden";
}
function openMenu( ref_menu ){
	controls.enabled = false;
	ref_menu.style.visibility = "visible";
}


// LEAP FUNCTIONS

function addMesh( meshes ) {
	let meshDim = 2;

	var geometry = new THREE.BoxGeometry( meshDim, meshDim, meshDim );
	var material = new THREE.MeshNormalMaterial();
	var mesh = new THREE.Mesh( geometry, material );
	meshes.push( mesh );

	return mesh;
}

function updateMesh( bone, mesh ) {
		mesh.position.fromArray( bone.center() );
		mesh.setRotationFromMatrix( ( new THREE.Matrix4 ).fromArray( bone.matrix() ) );
		mesh.quaternion.multiply( baseBoneRotation );
		mesh.scale.set( bone.width, bone.width, bone.length );

		scene.add( mesh );
}

// function leapAnimate( frame ) {
// 	var countBones = 0;
// 	var countArms = 0;
//
// 	armMeshes.forEach( function( item ) { scene.remove( item ) } );
// 	boneMeshes.forEach( function( item ) { scene.remove( item ) } );
//
// 	for ( var hand of frame.hands ) {
// 		for ( var finger of hand.fingers ) {
// 			for ( var bone of finger.bones ) {
//
// 				if ( countBones++ === 0 ) { continue; }
// 				var boneMesh = boneMeshes [ countBones ] || addMesh( boneMeshes );
// 				updateMesh( bone, boneMesh );
// 			}
// 		}
// 		var arm = hand.arm;
// 		var armMesh = armMeshes [ countArms++ ] || addMesh( armMeshes );
// 		updateMesh( arm, armMesh );
// 		armMesh.scale.set( arm.width / 4, arm.width / 2, arm.length );
//
// 		console.log( boneMeshes.length() );
// 	}
// }


// ANIMATION
function animate( frame ) {
  // RAYCASTER
  raycasting();

	// LEAP MOTION
	var countBones = 0;
	var countArms = 0;

	armMeshes.forEach( function( item ) { scene.remove( item ) } );
	boneMeshes.forEach( function( item ) { scene.remove( item ) } );

	for ( var hand of frame.hands ) {
		for ( var finger of hand.fingers ) {
			for ( var bone of finger.bones ) {
				if ( countBones++ === 0 ) { continue; }
				var boneMesh = boneMeshes [ countBones ] || addMesh( boneMeshes );
				updateMesh( bone, boneMesh );
			}
		}
		var arm = hand.arm;
		var armMesh = armMeshes [ countArms++ ] || addMesh( armMeshes );
		updateMesh( arm, armMesh );
		armMesh.scale.set( arm.width / 4, arm.width / 2, arm.length );
	}
	// console.log( boneMeshes.length() );
	controls.update();

	// RENDER
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}
function raycasting(){
  // set raycaster
  raycaster.setFromCamera( mouse, camera );
  // get intersecting elements
	if( scene_objects.length > 0 ){
	  let intersects = raycaster.intersectObjects( scene_objects );
	  // return all elements scale
	  for (let i = 0; i < scene_objects.length; i++) {
	    scene_objects[i].scale.set(1.0, 1.0, 1.0);
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
		obj.id = new_obj.id;
    // assign position
    obj.position.set( posX, posY, posZ );
    // add to scene
    scene.add(obj);

    // add to local list and db
    scene_objects.push( obj );
    if( is_new ){ // only add to the db if it's a new element, and not loaded from the db
      saveObject( new_obj );
    }
  });
}
function saveObject( obj ){
  // add user data
  obj.user = curr_user;
	obj.scene = curr_scene;
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
function loadObjects( scene_in ){
  // flush current scene and list
  for (let i = 0; i < scene_objects.length; i++) {
		scene.remove( scene_objects[i] );
    scene_objects[i].remove();
  }
	scene_objects = [];
  // get all the elements for the current user
	let this_user  = curr_user;
  let this_scene = scene_in;
  let query = JSON.stringify( {user: this_user, scene: this_scene} );
  // ask the db for the thingies!
  $.ajax({
    url: "https://api.mlab.com/api/1/databases/" + CONFIG.MLAB_DB + "/collections/" + CONFIG.MLAB_COL + "/?q=" + query + "&apiKey=" + CONFIG.MLAB_API,
    type: "GET",
    contentType: "application/json",
    // create each object we get
    success: function(data){
      // console.log(data);
      $.each(data, function(index, obj){
        createObject(obj.id, obj.url, obj.x, obj.y, obj.z, obj.wid, obj.hei, false);
      });
    }
  });
}


// SCENE & CAMERA SETTINGS
function saveCamera(){
	// don't save if the controls are not enabled
	if(controls.enabled){
		// create object to store
		let camera_data = {}
		// fill the data
		camera_data.user  = curr_user;
		camera_data.scene = curr_scene;
		camera_data.type  = "camera";
		camera_data.cam_matrix = camera.matrix.toArray();
		camera_data.cam_fov    = camera.fov;
		camera_data.cam_focus  = camera.focus;
		camera_data.cam_zoom   = camera.zoom;
		// parse data
		let data = JSON.stringify(camera_data);
		// create the query
		let this_user  = curr_user;
		let this_scene = curr_scene;
		let query = "q=" +JSON.stringify({ user: this_user, scene: this_scene, type: "camera" }) + "&";
	  // send to mlab db
	  $.ajax({
	    url: "https://api.mlab.com/api/1/databases/" + CONFIG.MLAB_DB + "/collections/" + CONFIG.MLAB_COL + "/?" + query + "u=true&apiKey=" + CONFIG.MLAB_API,
	    data: data,
	    type: "PUT",
	    contentType: "application/json",
	    success: function(data){ /*console.log("camera saved");*/ },
	    failure: function(data){ console.log("ERR, cam not saved"); },
	  });
	}
}
function loadCamera( scene_in ){
	// get the camera for the current user
	let this_user  = curr_user;
	let this_scene = scene_in;
	let query = JSON.stringify( { type: "camera", user: curr_user, scene: curr_scene } );
	// ask the db for the thingies!
	$.ajax({
		url: "https://api.mlab.com/api/1/databases/" + CONFIG.MLAB_DB + "/collections/" + CONFIG.MLAB_COL + "/?q=" + query + "&apiKey=" + CONFIG.MLAB_API,
		type: "GET",
		contentType: "application/json",
		// load the camera with the received information
		success: function(data){
			$.each(data, function(index, obj){
				if(obj.type == "camera"){
					console.log("camera!")
					console.log(obj);
					camera.matrix.fromArray(obj.cam_matrix);
					camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
					camera.fov   = obj.cam_fov;
					camera.focus = obj.cam_focus;
					camera.zoom  = obj.cam_zoom;
					camera.updateProjectionMatrix();
				}
			});
			console.log("camera loaded");
		}
	});
}


// ENVIRONMENT
function createEnvironment(){
	// REFERENCE PLANE
	let plane_geo = new THREE.PlaneGeometry(600, 600, 20, 20);
	let plane_mat = new THREE.MeshBasicMaterial({
		color: 0x555555,
		side: THREE.DoubleSide,
		wireframe: true
	});
	let ref_plane = new THREE.Mesh(plane_geo, plane_mat);
	ref_plane.rotation.x = Math.PI/2;
	ref_plane.position.set(0, 0, 0);
	scene.add(ref_plane);

	let axisHelper = new THREE.AxisHelper( 150 );
	scene.add( axisHelper );

	// TRACKER
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

	// SKYDOME
	let sky_geo = new THREE.SphereGeometry(600, 24, 24);
	// let sky_map = loader.load("https://raw.githubusercontent.com/nicolaspe/itp_oscinema/master/web_stories/pano/PANO_montreal.jpg");
	// let sky_map = loader.load("pano/RICOH_out.jpg");
	let sky_map = loader.load("pano/eso0932a_sphere.jpg");
	let sky_mat = new THREE.MeshBasicMaterial({
		map: sky_map,
		side: THREE.BackSide,
		// wireframe: true,
	});
	let skydome = new THREE.Mesh(sky_geo, sky_mat);
	scene.add(skydome);
}
