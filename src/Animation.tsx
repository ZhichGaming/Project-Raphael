import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { color } from 'three/examples/jsm/nodes/Nodes.js'

export default class Animation {
    // Scene and configuration
    scene!: THREE.Scene
    camera!: THREE.PerspectiveCamera
    renderer!: THREE.WebGLRenderer
    controls!: OrbitControls

    // Objects
    wireframe!: THREE.Mesh
    core!: THREE.Mesh
    lines!: THREE.Mesh[]
    cubes!: THREE.Mesh[]

    // State
    cubeRotationState: number = 0

    // Constants
    numLines = 30;
    numCubes = 16;
    cubeLength = 0.08;
    cubeRotationSpeed = 0.001;
    cubeCircleRadius = 0.8;

    constructor() {
        this.lines = []
        this.cubes = []

        this.init()

        // Resize canvas on window resize
        window.addEventListener('resize', () => {
            const canvas = document.getElementById('sun') as HTMLCanvasElement;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });
    }

    init() {
        const canvas = document.getElementById('sun') as HTMLCanvasElement

        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

        this.renderer = new THREE.WebGLRenderer({ canvas: canvas })
        
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        
        // this.camera.position.setZ(30);
        // this.camera.position.setX(-3);

        this.createWireframe()
        this.createCore()
        this.createLines()
        this.createCubes()

        const greenLight = new THREE.PointLight(0x00ff00, 100000, 3, 1)
        greenLight.position.set(0, 0, 0.5)
        this.scene.add( greenLight );

        this.camera.position.z = 5

        // Uncomment this and controls.update() in animate() for debugging and navigating using mouse 
        // this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.animate()
    }

    createWireframe() {
        const geometry = new THREE.IcosahedronGeometry(1.5, 0)
        const material = new THREE.MeshPhongMaterial({ color: 0xffffff, wireframe: true , emissive: 0xffffff, emissiveIntensity: 1  })
        this.wireframe = new THREE.Mesh(geometry, material)
        this.scene.add(this.wireframe)
    }

    createCore() {
        const geometry = new THREE.SphereGeometry(0.5 , 256, 128)
        const material = new THREE.MeshPhongMaterial( { color: 0xffffff, wireframe: true, emissive: 0xffffff, emissiveIntensity: 1 } );
        this.core = new THREE.Mesh(geometry, material)
        this.scene.add(this.core)
    }

    
    getRandomRotationMatrix() {
        var axis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
        var angle = Math.random() * Math.PI * 2;
        console.log(axis, angle)
        var matrix = new THREE.Matrix4().makeRotationAxis(axis, angle);
        return matrix;
    }

    createLines() {
        for (var i = 0; i < this.numLines; i++) {
            // Create line geometry
            // var geometry = new THREE.BufferGeometry();
            // var vertices = new Float32Array([
            //     0, 0, 0,
            //     0, 3, 0  // Adjust the length of the lines by changing the y-coordinate
            // ]);
            // geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

            // Create a cylinder geometry
            var cylinderGeometry = new THREE.CylinderGeometry(0.005, 0, 20, 32);
            const material = new THREE.MeshPhongMaterial({ color: 0x0000ff, emissive: 0x0000ff, emissiveIntensity: 0.1 }); 
            const cylinder = new THREE.Mesh( cylinderGeometry, material );

            // Apply a random rotation to each line
            cylinder.applyMatrix4(this.getRandomRotationMatrix());

            var angle = (i / this.numLines) * Math.PI * 2;
            cylinder.position.x = Math.cos(angle) * 0.00001;
            cylinder.position.y = Math.sin(angle) * 0.00001;

            this.lines.push(cylinder);

            // Add the line to the scene
            this.scene.add(cylinder);
        }
    }

    createCubes() {
        for (var i = 0; i < this.numCubes; i++) {
            // Create cube geometry
            var geometry = new THREE.BoxGeometry(this.cubeLength, this.cubeLength, this.cubeLength);

            // Create a cube material
            var material = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1});

            // Create a cube mesh
            var cube = new THREE.Mesh(geometry, material);

            // Set position of the cube to form a circle around the wireframe
            var angle = (i / this.numCubes) * Math.PI * 2;
            cube.position.x = Math.cos(angle) * this.cubeCircleRadius;
            cube.position.y = Math.sin(angle) * this.cubeCircleRadius;

            this.cubes.push(cube);

            // Add the cube to the scene
            this.scene.add(cube);
        }
    }

    animate() {
        this.wireframe.rotation.x += 0.01
        this.wireframe.rotation.y += 0.01
        this.core.rotation.x += 0.01
        this.core.rotation.y += 0.01

        this.lines.forEach(function (line) {
            line.rotation.z += 0.01;
            console.log(line.rotation.z)
        });

        this.cubes.forEach((cube, i) => {
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;

            var angle = (i / this.numCubes + this.cubeRotationState) * Math.PI * 2;
            cube.position.x = Math.cos(angle) * this.cubeCircleRadius;
            cube.position.y = Math.sin(angle) * this.cubeCircleRadius;
        });

        this.cubeRotationState += this.cubeRotationSpeed;

        // Uncomment for debugging and navigating using mouse
        // this.controls.update();

        this.renderer.render(this.scene, this.camera)
        requestAnimationFrame(this.animate.bind(this))
    }
}
