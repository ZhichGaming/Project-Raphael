import * as THREE from 'three'
import { EffectComposer, OutputPass, RenderPass, ShaderPass, UnrealBloomPass } from 'three/examples/jsm/Addons.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { vertexShader } from './shaders/VertexShader'
import { fragmentShader } from './shaders/FragmentShader'

export default class Animation {
    // Scene and configuration
    scene!: THREE.Scene
    camera!: THREE.PerspectiveCamera
    renderer!: THREE.WebGLRenderer
    finalComposer!: EffectComposer
    renderScene!: RenderPass
    outputPass!: OutputPass
    controls!: OrbitControls

    // Bloom
    bloomComposer!: EffectComposer
    bloomPass!: UnrealBloomPass
    mixPass!: ShaderPass
    bloomLayer!: THREE.Layers
    materials!: THREE.Material[]

    // Objects
    wireframe!: THREE.Mesh
    core!: THREE.Mesh
    lines!: THREE.Mesh[]
    cubes!: THREE.Mesh[]

    // State
    cubeRotationState: number = 0

    // Constants
    numLines = 20;
    numCubes = 16;
    cubeLength = 0.08;
    cubeRotationSpeed = 0.001;
    cubeCircleRadius = 0.8;

    constructor() {
        this.lines = []
        this.cubes = []
        this.materials = []

        this.init()

        // Resize canvas on window resize
        window.addEventListener('resize', () => {
            const canvas = document.getElementById('sun') as HTMLCanvasElement;
            canvas.width = window.innerWidth * 1.5;
            canvas.height = window.innerHeight;

            this.renderer.setSize(window.innerWidth * 1.5, window.innerHeight);
            this.camera.aspect = window.innerWidth * 1.5 / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });
    }

    init() {
        const canvas = document.getElementById('sun') as HTMLCanvasElement

        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth * 1.5 / window.innerHeight, 0.1, 1000)

        this.renderer = new THREE.WebGLRenderer({ canvas: canvas })
        
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth * 1.5, window.innerHeight)

        this.renderScene = new RenderPass(this.scene, this.camera);
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth * 1.5, window.innerHeight), 1.5, 0.4, 0.85);

        this.bloomComposer = new EffectComposer( this.renderer );
        this.bloomComposer.renderToScreen = false;
        this.bloomComposer.addPass(this.renderScene);
        this.bloomComposer.addPass(this.bloomPass);
        
        this.mixPass = new ShaderPass(
            new THREE.ShaderMaterial({
                uniforms: {
                    baseTexture: { value: null },
                    bloomTexture: { value: this.bloomComposer.renderTarget2.texture }
                },
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                defines: {}
            }), "baseTexture"
        );
        this.mixPass.needsSwap = true;

        this.outputPass = new OutputPass();

        this.finalComposer = new EffectComposer( this.renderer );

        this.finalComposer.addPass(this.renderScene);
        this.finalComposer.addPass(this.mixPass);
        this.finalComposer.addPass(this.outputPass);

        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = Math.pow(0.68, 5.0);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        const BLOOM_SCENE = 1;
        this.bloomLayer = new THREE.Layers();
        this.bloomLayer.set(BLOOM_SCENE);

        // const raycaster = new THREE.Raycaster();
        // const mouse = new THREE.Vector2();

        // // When the mouse is clicked, make the object that was clicked on glow.
        // this.renderer.domElement.addEventListener('pointerdown', (event) => {
        //     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        //     mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

        //     raycaster.setFromCamera(mouse, this.camera);

        //     const intersects = raycaster.intersectObjects(this.scene.children);

        //     if (intersects.length > 0) {
        //         const object = intersects[0].object;
        //         object.layers.toggle(BLOOM_SCENE);
        //     }
        // });
        
        // this.camera.position.setZ(30);
        // this.camera.position.setX(-3);

        this.createWireframe()
        this.createCore()
        this.createLines()
        this.createCubes()

        const pointLight = new THREE.PointLight(0xffffff, 500, 5, 1)
        pointLight.position.set(0, 0, 0)
        this.scene.add( pointLight );


        this.camera.position.z = 5

        // Uncomment this and controls.update() in animate() for debugging and navigating using mouse 
        // this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.animate()
    }

    createWireframe() {
        const geometry = new THREE.IcosahedronGeometry(2.2, 0)
        const material = new THREE.MeshPhongMaterial({ color: 0xffffff, wireframe: true , emissive: 0xffffff, emissiveIntensity: 1  })
        this.wireframe = new THREE.Mesh(geometry, material)
        this.wireframe.position.set(0, 0, -2)

        this.scene.add(this.wireframe)
    }

    createCore() {
        const geometry = new THREE.IcosahedronGeometry(0.35)
        // const geometry = new THREE.SphereGeometry(0.35, 32, 16)
        const material = new THREE.MeshPhongMaterial( { color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1 } );
        this.core = new THREE.Mesh(geometry, material)
        this.scene.add(this.core)

        this.core.layers.enable(1);
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

            // Second length should be 0.005 when in sudo mode.
            var cylinderGeometry = new THREE.CylinderGeometry(0.005, 0, 3/Math.random(), 32);
            const material = new THREE.MeshPhongMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 1 }); 
            const cylinder = new THREE.Mesh( cylinderGeometry, material );

            // Apply a random rotation to each line
            cylinder.applyMatrix4(this.getRandomRotationMatrix());

            this.lines.push(cylinder);

            // Add the line to the scene
            this.scene.add(cylinder);

            // Uncomment to make the lines glow.
            cylinder.layers.toggle(1);
        }
    }

    createCubes() {
        for (var i = 0; i < this.numCubes; i++) {
            // Create cube geometry
            var geometry = new THREE.BoxGeometry(this.cubeLength, this.cubeLength, this.cubeLength);

            // Create a cube material
            var material = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 0.5 });

            // Create a cube mesh
            var cube = new THREE.Mesh(geometry, material);

            // Set position of the cube to form a circle around the wireframe
            var angle = (i / this.numCubes) * Math.PI * 2;
            cube.position.x = Math.cos(angle) * this.cubeCircleRadius;
            cube.position.y = Math.sin(angle) * this.cubeCircleRadius;

            this.cubes.push(cube);

            // Add the cube to the scene
            this.scene.add(cube);

            // Uncomment to make the cubes glow.
            // cube.layers.toggle(1);
        }
    }

    nonBloomed(obj: any) {
        if (obj.isMesh && this.bloomLayer.test(obj.layers) === false) {
            this.materials[obj.uuid] = obj.material;
            obj.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        }
    }

    restoreMaterial(obj: any) {
        if (this.materials[obj.uuid]) {
            obj.material = this.materials[obj.uuid];
            delete this.materials[obj.uuid];
        }
    }

    animate() {
        this.wireframe.rotation.x += 0.01
        this.wireframe.rotation.y += 0.01
        this.core.rotation.x += 0.01
        this.core.rotation.y += 0.01

        this.lines.forEach(function (line) {
            line.rotation.z += 0.005;
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

        // this.renderer.render(this.scene, this.camera)

        this.scene.traverse(this.nonBloomed.bind(this));
        this.bloomComposer.render();
        this.scene.traverse(this.restoreMaterial.bind(this));
        this.finalComposer.render();

        //requestAnimationFrame(this.animate.bind(this))
    }
}
