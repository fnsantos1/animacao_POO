const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

const vertexShaderSource = `#version 300 es

in vec2 aPosition;

uniform mat3 u_viewTransform;
uniform mat3 u_modelTransform;

void main() {

    vec3 position =
        u_viewTransform *
        u_modelTransform *
        vec3(aPosition, 1.0);

    gl_Position =
        vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es

precision mediump float;

uniform vec3 uColor;

out vec4 outColor;

void main() {

    outColor =
        vec4(uColor, 1.0);
}
`;

function createShader(gl, type, source) {

    const shader =
        gl.createShader(type);

    gl.shaderSource(
        shader,
        source
    );

    gl.compileShader(shader);

    if (
        !gl.getShaderParameter(
            shader,
            gl.COMPILE_STATUS
        )
    ) {

        const error =
            gl.getShaderInfoLog(shader);

        gl.deleteShader(shader);

        throw new Error(error);
    }

    return shader;
}

function createProgram(
    gl,
    vertexShaderSource,
    fragmentShaderSource
) {

    const vertexShader =
        createShader(
            gl,
            gl.VERTEX_SHADER,
            vertexShaderSource
        );

    const fragmentShader =
        createShader(
            gl,
            gl.FRAGMENT_SHADER,
            fragmentShaderSource
        );

    const program =
        gl.createProgram();

    gl.attachShader(
        program,
        vertexShader
    );

    gl.attachShader(
        program,
        fragmentShader
    );

    gl.linkProgram(program);

    if (
        !gl.getProgramParameter(
            program,
            gl.LINK_STATUS
        )
    ) {

        throw new Error(
            gl.getProgramInfoLog(program)
        );
    }

    return program;
}


const program =
    createProgram(
        gl,
        vertexShaderSource,
        fragmentShaderSource
    );


// ==================================================
// CLASSE RENDERER
// ==================================================

class Renderer {

    constructor(gl, program) {
        this.gl = gl;
        this.program = program;

        this.positionLocation =
            gl.getAttribLocation(
                program,
                "aPosition"
            );

        this.colorLocation =
            gl.getUniformLocation(
                program,
                "uColor"
            );

        this.viewTransformLocation =
            gl.getUniformLocation(
                program,
                "u_viewTransform"
            );

        this.modelTransformLocation =
            gl.getUniformLocation(
                program,
                "u_modelTransform"
            );

        this.viewTransform =
            m3.identity();

        this.verticesBuffer =
            gl.createBuffer();
    }

    defineViewTransform(viewTransform) {
        this.viewTransform =
            viewTransform;
    }

    draw(object) {
        const gl = this.gl;

        gl.bindBuffer(
            gl.ARRAY_BUFFER,
            this.verticesBuffer
        );

        gl.bufferData(
            gl.ARRAY_BUFFER,
            object.vertices,
            gl.STATIC_DRAW
        );

        gl.enableVertexAttribArray(
            this.positionLocation
        );

        gl.vertexAttribPointer(
            this.positionLocation,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.uniform3fv(
            this.colorLocation,
            object.color
        );

        gl.uniformMatrix3fv(
            this.modelTransformLocation,
            false,
            object.modelTransform
        );

        gl.uniformMatrix3fv(
            this.viewTransformLocation,
            false,
            this.viewTransform
        );

        gl.drawArrays(
            gl.TRIANGLES,
            0,
            object.vertices.length / 2
        );
    }
}

// ==================================================
// AUXILIARY FUNCTIONS
// ==================================================

function rectangleVertices(x,y,width,height){
    return [
        x, y,
        x+width, y+height,
        x, y+height,

        x, y,
        x+width, y,
        x+width, y+height
    ];
}

function circleVertices(radius,numSegments){
    const vertices = [];

    for (let i = 0; i < numSegments; i++) {
        const theta1 =
            (i / numSegments) *
            2 * Math.PI;

        const theta2 =
            ((i + 1) / numSegments) *
            2 * Math.PI;


        vertices.push(
            0,
            0
        );

        vertices.push(
            radius * Math.cos(theta1),
            radius * Math.sin(theta1)
        );


        vertices.push(
            radius * Math.cos(theta2),
            radius * Math.sin(theta2)
        );
    }

    return vertices;
}

// ==================================================
// GROUND VERTICES
// ==================================================

function groundVertices() {

    const vertices = rectangleVertices(-2.0,-1.0,4.0,0.6);

    return new Float32Array(vertices);
}


// ==================================================
// ROBOT HEAD VERTICES
// ==================================================

function robotHeadVertices() {

    const vertices = [];

    vertices.push(...rectangleVertices(-0.07,-0.07,0.14,0.14));
    vertices.push(...rectangleVertices(-0.01,0.07,0.02,0.05));

    const antenna = circleVertices(0.025,12);

    for (let i = 0; i < antenna.length; i += 2) {
        vertices.push(antenna[i], antenna[i+1] + 0.14);
    }

    return new Float32Array(vertices);
}


// ==================================================
// ROBOT BODY VERTICES
// ==================================================

function robotBodyVertices() {

    const vertices = [];

    vertices.push(...rectangleVertices(-0.09,0.25,0.18,0.32));
    vertices.push(...rectangleVertices(-0.13,0.52,0.26,0.05));

    return new Float32Array(vertices);
}


// ==================================================
// ROBOT LIMB VERTICES
// ==================================================

function robotLimbVertices(length) {

    const vertices = rectangleVertices(-0.03,-length,0.06,length);

    return new Float32Array(vertices);
}


// ==================================================
// CLASSE SCENE OBJECT
// ==================================================

class SceneObject {

    constructor(vertices, color) {

        this.vertices = vertices;

        this.color = color; 

        this.modelTransform = m3.identity();
    }

    updateModelTransform(modelTransform) {

        this.modelTransform = modelTransform;
    }
}


// ==================================================
// CLASSE GROUND
// ==================================================

class Ground extends SceneObject {

    constructor() {

        super(
            groundVertices(),

            new Float32Array([
                0.2,
                0.2,
                0.2
            ])
        );
    }


    draw(renderer) {

        renderer.draw(this);
    }
}


// ==================================================
// CLASSE ROBOT HEAD
// ==================================================

class RobotHead extends SceneObject {

    constructor(color, angularSpeed) {

        super(

            robotHeadVertices(),

            color
        );

        this.theta = 0.0;

        this.angularSpeed = angularSpeed;
    }


    updateRotation() {

        this.theta += this.angularSpeed;
    }


    updateModelTransform(robotModelTransform) {

        const localTransform =

            m3.translation(
                0.0,
                0.64 + 0.015 * Math.sin(this.theta)
            );

        this.modelTransform =

            m3.multiply(
                robotModelTransform,
                localTransform
            );
    }
}


// ==================================================
// CLASSE ROBOT BODY
// ==================================================

class RobotBody extends SceneObject {

    constructor(color) {

        super(

            robotBodyVertices(),

            color
        );
    }
}


// ==================================================
// CLASSE ROBOT LIMB
// ==================================================

class RobotLimb extends SceneObject {

    constructor(xPosition, yPosition, length, angularSpeed, amplitude, phase) {

        super(

            robotLimbVertices(length),

            new Float32Array([
                0.5,
                0.5,
                0.5
            ])
        );

        this.xPosition = xPosition;

        this.yPosition = yPosition;

        this.theta = phase;

        this.angularSpeed = angularSpeed;

        this.amplitude = amplitude;
    }


    updateAngularSpeed(angularSpeed) {

        this.angularSpeed = angularSpeed;
    }

    updateRotation() {

        this.theta += this.angularSpeed;
    }


    updateModelTransform(robotModelTransform) {

        const localTransform =

            m3.multiply(
                m3.translation(this.xPosition,this.yPosition),
                m3.rotation(this.amplitude * Math.sin(this.theta))
            );

        this.modelTransform =

            m3.multiply(
                robotModelTransform,
                localTransform
            );
    }
}


// ==================================================
// CLASSE ROBOT
// ==================================================

class Robot {

    constructor(tx, ty, color, speed) {

        this.tx = tx;

        this.ty = ty;

        this.speed = speed;

        this.armAngularSpeed = 0.09;

        this.legAngularSpeed = 0.05;

        this.head = new RobotHead(color,0.06);

        this.body = new RobotBody(color);

        this.leftArm = new RobotLimb(-0.13,0.545,0.24,this.armAngularSpeed,0.9,0.0);

        this.rightArm = new RobotLimb(0.13,0.545,0.24,this.armAngularSpeed,0.9,Math.PI);

        this.leftLeg = new RobotLimb(-0.05,0.25,0.25,this.legAngularSpeed,0.45,Math.PI);

        this.rightLeg = new RobotLimb(0.05,0.25,0.25,this.legAngularSpeed,0.45,0.0);

        this.limbs = [

            this.leftArm,

            this.rightArm,

            this.leftLeg,

            this.rightLeg
        ];
    }

    move() {

        this.tx += this.speed;

        if ( this.tx > 1.8 || this.tx < -1.8) {

            this.speed = -this.speed;

            this.armAngularSpeed = -this.armAngularSpeed;

            this.legAngularSpeed = -this.legAngularSpeed;

            this.leftArm.updateAngularSpeed(this.armAngularSpeed);

            this.rightArm.updateAngularSpeed(this.armAngularSpeed);

            this.leftLeg.updateAngularSpeed(this.legAngularSpeed);

            this.rightLeg.updateAngularSpeed(this.legAngularSpeed);
        }

        const robotTransform = m3.translation(this.tx,this.ty);

        this.body.updateModelTransform(robotTransform);

        this.head.updateRotation();

        this.head.updateModelTransform(robotTransform);

        for (const limb of this.limbs) {

            limb.updateRotation();

            limb.updateModelTransform(robotTransform);
        }
    }

    draw(renderer) {

        renderer.draw(this.leftLeg);

        renderer.draw(this.rightLeg);

        renderer.draw(this.body);

        renderer.draw(this.head);

        renderer.draw(this.leftArm);

        renderer.draw(this.rightArm);
    }
}


// ==================================================
// CLASSE SCENE
// ==================================================

class Scene {

    constructor(gl, program) {

        this.renderer = new Renderer(gl,program);

        this.viewTransform = m3.setClippingWindow(-2.0,-1.0,2.0,1.0);

        this.renderer.defineViewTransform(this.viewTransform);

        this.ground = new Ground();

        this.robots = [

            new Robot(-1.2,-0.4,new Float32Array([1.0,0.0,0.0]),0.003),

            new Robot(0.0,-0.4,new Float32Array([1.0,1.0,0.0]),0.005),

            new Robot(1.2,-0.4,new Float32Array([0.0,0.6,1.0]),0.002)

        ];
    }

    update() {

        for (const robot of this.robots) {
            robot.move();
        }
    }

    draw() {

        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);

        this.ground.draw(this.renderer);

        for (const robot of this.robots) {
            robot.draw(this.renderer);
        }
    }

    execute() {

        this.update();

        this.draw();

        requestAnimationFrame(() => this.execute());
    }

    init() {

        requestAnimationFrame(() => this.execute());
    }
}


// ==================================================
// CONFIGURAÇÃO INICIAL DO WEBGL
// ==================================================

gl.clearColor(
    0.1,
    0.1,
    0.1,
    1.0
);

gl.viewport(
    0,
    0,
    canvas.width,
    canvas.height
);


// ==================================================
// CRIAR CENA
// ==================================================

const scene =
    new Scene(gl,program);


// ==================================================
// INICIAR ANIMAÇÃO
// ==================================================

scene.init();