import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export default class Animation {
    // Scene and configuration
    scene!: THREE.Scene
    camera!: THREE.PerspectiveCamera
    renderer!: THREE.WebGLRenderer
    controls!: OrbitControls

    // Objects
    core!: THREE.Mesh
    lines!: THREE.Mesh[]
    cubes!: THREE.Mesh[]

    // State
    cubeRotationState: number = 0

    // Constants
    numLines = 30;
    numCubes = 15;
    cubeRotationSpeed = 0.001;

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

        this.createCore()
        this.createLines()
        this.createCubes()

        const pointLight = new THREE.PointLight(0xffffff)
        pointLight.position.set(0, 0, 0)
        this.scene.add(pointLight)

        this.camera.position.z = 5

        // Uncomment this and controls.update() in animate() for debugging and navigating using mouse 
        // this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.animate()
    }

    createCore() {
        const geometry = new THREE.IcosahedronGeometry(1, 0)
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
        this.core = new THREE.Mesh(geometry, material)
        this.scene.add(this.core)
    }

    
    getRandomRotationMatrix() {
        var axis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
        var angle = Math.random() * Math.PI * 2;
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
            var cylinderGeometry = new THREE.CylinderGeometry(0.005, 0, 10, 32);
            const material = new THREE.MeshBasicMaterial({ color: 0x606060 }); 
            const cylinder = new THREE.Mesh( cylinderGeometry, material );

            // Apply a random rotation to each line
            cylinder.applyMatrix4(this.getRandomRotationMatrix());

            this.lines.push(cylinder);

            // Add the line to the scene
            this.scene.add(cylinder);
        }
    }

    createCubes() {
        for (var i = 0; i < this.numCubes; i++) {
            // Create cube geometry
            var geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);

            // Create a cube material
            var material = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });

            // Create a cube mesh
            var cube = new THREE.Mesh(geometry, material);

            // Set position of the cube to form a circle around the core
            var angle = (i / this.numCubes) * Math.PI * 2;
            var radius = 0.5;
            cube.position.x = Math.cos(angle) * radius;
            cube.position.y = Math.sin(angle) * radius;

            this.cubes.push(cube);

            // Add the cube to the scene
            this.scene.add(cube);
        }
    }

    animate() {
        
        this.core.rotation.x += 0.01
        this.core.rotation.y += 0.01

        this.lines.forEach(function (line) {
            // line.rotation.x += 0.01;
            // line.rotation.y += 0.01;
            line.rotation.z += 0.01;
        });

        this.cubes.forEach((cube, i) => {
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;

            var angle = (i / this.numCubes + this.cubeRotationState) * Math.PI * 2;
            var radius = 0.5;
            cube.position.x = Math.cos(angle) * radius;
            cube.position.y = Math.sin(angle) * radius;
        });

        this.cubeRotationState += this.cubeRotationSpeed;

        // Uncomment for debugging and navigating using mouse
        // this.controls.update();

        this.renderer.render(this.scene, this.camera)
        requestAnimationFrame(this.animate.bind(this))
    }
}
