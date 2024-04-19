/* Demo configuration constants */
const SPAWN_RATE = 0.08;
const MIN_SHAPE_TIME = 0.25;
const MAX_SHAPE_TIME = 6;
const MIN_SHAPE_SPEED = 125;
const MAX_SHAPE_SPEED = 350;
const MIN_SHAPE_SIZE = 2;
const MAX_SHAPE_SIZE = 50;
const MAX_SHAPE_COUNT = 250;

/* Display an error message to the DOM, beneath the demo element */

function showError(errorText) {
	const errorBoxDiv = document.getElementById('error-box');
	const errorTextElement = document.createElement('p');
	errorTextElement.innerText = errorText;
	errorBoxDiv.appendChild(errorTextElement);
	console.log(errorText);
}

const vertexShaderSourceCode = `#version 300 es
precision mediump float;

in vec2 vertexPosition;
in vec3 vertexColor;

out vec3 fragmentColor;

uniform vec2 canvasSize;
uniform vec2 shapeLocation;
uniform float shapeSize;

void main() {
	
  fragmentColor = vertexColor;
  // Use this to calculate
  // the position on where to draw the object
  vec2 finalVertexPosition = vertexPosition * shapeSize + shapeLocation;  

  // Use this to convert from vertex space into clipspace - from GPU to Presentation
  // Position of clipped vertex range from -1 to 1 so we have to adjust the (finalVertexPosition / canvasSize)
  // that generates 0 to 1
  
  vec2 clipPosition = (finalVertexPosition / canvasSize) * 2.0 - 1.0;
  gl_Position = vec4(clipPosition, 0.0, 1.0);
	
}`;

const fragmentShaderSourceCode = `#version 300 es
precision mediump float;

in vec3 fragmentColor;
out vec4 outputColor;

void main() {
  outputColor = vec4(fragmentColor, 1.0);
}`;

const trianglePositions = new Float32Array([
  // Top middle
  0, 1,
  // Bottom left
  -1, -1,
  // Bottom right
   1, -1
]);

const rgbTriangleColors = new Uint8Array([
  255, 0, 0,
  0, 255, 0,
  0, 0, 255
]);
const fireyTriangleColors = new Uint8Array([
  // Chili red - E52F0F
  229, 47, 15,
  // Jonquil - F6CE1D
  246, 206, 29,
  // Gamboge - E99A1A
  233, 154, 26
]);

function createStaticVertexBuffer(gl, data) {
  const buffer = gl.createBuffer();
  if (!buffer) {
	 showError('Failed to allocate buffer');
	 return null;
  }
  
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  return buffer;
	
}

function createTwoBufferVao(gl, positionBuffer, colorBuffer, positionAttribLocation, colorAttribLocation) {
  const vao = gl.createVertexArray();
  if (!vao) {
	showError('Failed to allocate VAO for two buffers');
	return null;
  }
  
  // Bind the vertexarray to be able to store data for our vao
  
  gl.bindVertexArray(vao);
  
  // Enable what we will want to buffer
  
  gl.enableVertexAttribArray(positionAttribLocation);
  gl.enableVertexAttribArray(colorAttribLocation);
  
  // Bind the buffer and set pointer properties - aka how the GPU will parse the data array
  // in bound buffer
  
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(		// assign pointer properties for what is bound in bufffer
    positionAttribLocation, 2, gl.FLOAT, false, 0, 0
  );
  
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.vertexAttribPointer(
    colorAttribLocation, 3, gl.UNSIGNED_BYTE, true, 0, 0
  );
  
  // clear/unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindVertexArray(null);
  
  return vao;
}

function getRandomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

class MovingShape {
  constructor(
    position = [],
	velocity = [],
	size,
	timeRemaining,
	vao
  ) {
	this.position = position;
	this.velocity = velocity;
	this.size = size;
	this.timeRemaining = timeRemaining;
	this.vao = vao;
  }
  
  isAlive() {
	return this.timeRemaining > 0;
  }
  
  update(dt) {
	this.position[0] += this.velocity[0] * dt;
	this.position[1] += this.velocity[1] * dt;
	
	this.timeRemaining -= dt;
  }
	
};

function movementAndColorDemo() {
  /* @type {HTMLCanvasElement | null} */
  const canvas = document.getElementById('demo-canvas');
  if (!canvas) {
	 showError('Cannot get demo-canvas reference - check for typos or loading script too early in HTML');
	 return;
  }
  const gl = canvas.getContext('webgl2');
  if (!gl) {
	const isWebGl1Supported = !!canvas.getContext('webgl');
	if (isWebGl1Supported) {
	  showError('This browser supports WebGL 1 but not WebGL 2 - make sure WebGlL 2 isn\'t disabled in your browser');	
	}
	else {
	 showError('This browser does not support WebGL 2 - this demo will not work!');
	 return;
	}
  }

/* Conversion to Cpu Float32, Javascript uses Float64 */

const triangleGeoBuffer = createStaticVertexBuffer(gl, trianglePositions);
const rgbTriangleColorBuffer = createStaticVertexBuffer(gl, rgbTriangleColors);
const fireyTriangleColorBuffer = createStaticVertexBuffer(gl, fireyTriangleColors);

if (!triangleGeoBuffer || !rgbTriangleColorBuffer || !fireyTriangleColorBuffer) {
  showError(`Failed to create vertex buffers (triangle pos=${!!triangleGeoBuffer},`
    + ` rgb tri color=${!!rgbTriangleColorBuffer}, `
	+ ` firey tri color=${fireyTriangleColorBuffer})`
  );
  
  return null;	
}

const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSourceCode);
gl.compileShader(vertexShader);

if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
  const compileError = gl.getShaderInfoLog(vertexShader);
  showError(`Failed to COMPILE vertex shader - ${compileError}`);
  return;
}

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSourceCode);
gl.compileShader(fragmentShader);

if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
  const compileError = gl.getShaderInfoLog(fragmentShader);
  showError(`Failed to COMPILE fragment shader - ${compileError}`);
  return;
}

const triangleShaderProgram = gl.createProgram();
gl.attachShader(triangleShaderProgram, vertexShader);
gl.attachShader(triangleShaderProgram, fragmentShader);
gl.linkProgram(triangleShaderProgram);

if (!gl.getProgramParameter(triangleShaderProgram, gl.LINK_STATUS)) {
  const linkError = gl.getProgramInfoLog(triangleShaderProgram);
  showError(`Failed to LINK shaders - ${linkError}`);
  return;  
}

const vertexPositionAttributeLocation = gl.getAttribLocation(triangleShaderProgram, 'vertexPosition');
const vertexColorAttributeLocation = gl.getAttribLocation(triangleShaderProgram, 'vertexColor');

if (vertexPositionAttributeLocation < 0 || vertexColorAttributeLocation < 0) {
  showError(`Failed to get attribute locations: (pos=${vertexPositionAttributeLocation},`
    + ` color=${vertexColorAttributeLocation})`
  );
  return;
}

// Get uniform locations

const shapeLocationUniform = gl.getUniformLocation(triangleShaderProgram, 'shapeLocation');
const shapeSizeUniform = gl.getUniformLocation(triangleShaderProgram, 'shapeSize');
const canvasSizeUniform = gl.getUniformLocation(triangleShaderProgram, 'canvasSize');

if(shapeLocationUniform === null || shapeSizeUniform === null || canvasSizeUniform === null) {
  showError(`Failed to get uniform locations (shapeLocation=${!!shapeLocationUniform})`
    + `, shapeSize=${!!shapeSizeUniform}`
    + `, canvasSize=${!!canvasSizeUniform}`);
	return;
}

// Create VAOS

const rgbTriangleVao = createTwoBufferVao(
gl, triangleGeoBuffer, rgbTriangleColorBuffer,
vertexPositionAttributeLocation, vertexColorAttributeLocation
);

const fireyTriangleVao = createTwoBufferVao(
gl, triangleGeoBuffer, fireyTriangleColorBuffer,
vertexPositionAttributeLocation, vertexColorAttributeLocation
);

if (!rgbTriangleVao || !fireyTriangleVao) {
  showError(`Failed to create VAOs: (`
    + `rgbTriangle=${!!rgbTriangleVao}, `
	+ `fireyTriangle=${!!fireTriangleVao})`
  );
  
  return;
	
}

// Set up logical objects
let shapes = [
];
let timeToNextSpawn = SPAWN_RATE;


let lastFrameTime = performance.now();

const frame = function () {

  const thisFrameTime = performance.now();
  const dt = (thisFrameTime - lastFrameTime) / 1000;
  lastFrameTime = thisFrameTime;
  
  // Update the shapes
  
  timeToNextSpawn -= dt;
  
  while (timeToNextSpawn < 0) {
	timeToNextSpawn += SPAWN_RATE;
	
	const movementAngle = getRandomInRange(0, 2 * Math.PI);
	const movementSpeed = getRandomInRange(MIN_SHAPE_SPEED, MAX_SHAPE_SPEED);
	
	const position = [ canvas.width / 2, canvas.height / 2];
	const velocity = [
	  Math.sin(movementAngle) * movementSpeed,
	  Math.cos(movementAngle) * movementSpeed
	];
	
	const size = getRandomInRange(MIN_SHAPE_SIZE, MAX_SHAPE_SIZE);
	const timeRemaining = getRandomInRange(MIN_SHAPE_TIME, MAX_SHAPE_TIME);
	
	const vao = (Math.random() < 0.5) ? rgbTriangleVao : fireyTriangleVao;
	
	const shape = new MovingShape(position, velocity, size, timeRemaining, vao);
	
	shapes.push(shape);
  }

  for (let i = 0; i < shapes.length; i++) {
	shapes[i].update(dt);  
  }
  
  shapes = shapes.filter((shape) => shape.isAlive()).slice(0, MAX_SHAPE_COUNT);
	
  // Render the Frame
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  gl.clearColor(0.08, 0.08, 0.08, 1.0);

  /* The bits of Color and Depths can be combined with and OR operation to clear both */
  /* Since 1 | 0 - 0 | 1 - results in 1 and likewise clears both the operands on result 1 */
  
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  // Rasterizer - Which pixels are part of a triangle
  // x, y start, width to draw to, height to draw to
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Vertex shader - How to place those vertices in clip space
  // Fragment shader - What color a pixel should be
  // - Set GPU program (vertex + fragment shader pair)

  gl.useProgram(triangleShaderProgram);

  // Set uniforms shared across frame...

  gl.uniform2f(canvasSizeUniform, canvas.width, canvas.height);

  // Draw the shapes

  for (let i = 0; i < shapes.length; i++) {
    gl.uniform1f(shapeSizeUniform, shapes[i].size);
    gl.uniform2f(shapeLocationUniform, shapes[i].position[0], shapes[i].position[1]);
    gl.bindVertexArray(shapes[i].vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  
  }
  
  requestAnimationFrame(frame);
};

requestAnimationFrame(frame);

}

try {
  movementAndColorDemo();	
} catch (e) {
    showError(`Uncaught Javascript exception: ${e}`);	
}



