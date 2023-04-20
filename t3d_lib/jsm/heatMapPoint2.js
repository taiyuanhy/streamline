import {
	Scene,
	PlaneGeometry,
	Geometry,
	Mesh,
	Camera,
	Vector3,
	Vector4,
	Quaternion,
	Matrix4,
	ShaderPostPass,
	Color3,
	BUFFER_USAGE,
	DRAW_MODE,
	BLEND_TYPE,
	ShaderMaterial,
	BasicMaterial,
	Texture2D,
	DRAW_SIDE,
	RenderTarget2D,
	Attribute,
	Buffer,
	WEBGL_TEXTURE_FILTER,
	TEXEL_ENCODING_TYPE


} from "../../build/t3d.module.js";
import { Vector2 } from "../../src/math/Vector2.js";

/* 脚本使用文档：（传入的参数均应是float型或boolean型，否则影响着色器的运行）
*
* 1、创建一个数据集，存放多个热力图点的强度、X坐标和Y坐标
*
* 2、new一个heatMap对象，并将创建的数据集传入
*
* 3、可以通过GUI组件设置热度图的其它属性，包括热度图点半径、热力图点强度、热度图分辨率、热度图透明度
*
* 4、在模型材质的map属性后调用getTexture()方法，将热度图贴到设置的地方
*
* 5、调用类中的update()方法，并将声明的WebGLRenderer传进去（此方法一定在render(scene, camera)前面调用，否则渲染不出来）
*
*/

class heatMap {

	constructor(data) {
		this._max = 1;
		this._min = 0;

		this._dataDirty = true;

		this._data = [];

		this._alpha = false;

		this._grad = {};
		var gradCanvas = this._createCanvas();
		gradCanvas.width = 1;
		gradCanvas.height = 256;
		this._gradCtx = gradCanvas.getContext('2d');
		this._gradCache = {};
		this._gradData = null;

		this._r = 0;
		this._radius = 0;
		this._blur = 0;
		this._circle = this._createCanvas();
		this._cirCtx = this._circle.getContext('2d');

		this.defaultRadius = 25,

		this.defaultGradient = {
			0.4: 'blue',
			0.6: 'cyan',
			0.7: 'lime',
			0.8: 'yellow',
			1.0: 'red'
		},

		this.dataSXY = data;// 存放热力点数据

		const canvas = document.createElement('canvas');
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		// document.body.appendChild(canvas);

		this.scene1 = new Scene();
		this.scene2 = new Scene();
		this.renderTarget1 = new RenderTarget2D(window.innerWidth, window.innerHeight);
		this.renderTarget2 = new RenderTarget2D(window.innerWidth, window.innerHeight);
		this.renderTarget1.texture.minFilter = WEBGL_TEXTURE_FILTER.LINEAR;
		this.renderTarget1.texture.magFilter = WEBGL_TEXTURE_FILTER.LINEAR;
		this.renderTarget1.texture.encoding = TEXEL_ENCODING_TYPE.GAMMA;
		this.renderTarget1.texture.generateMipmaps = false;

		this.renderTarget2.texture.minFilter = WEBGL_TEXTURE_FILTER.LINEAR;
		this.renderTarget2.texture.magFilter = WEBGL_TEXTURE_FILTER.LINEAR;
		this.renderTarget2.texture.encoding = TEXEL_ENCODING_TYPE.GAMMA;
		this.renderTarget2.texture.generateMipmaps = false;


		this.planeData = [];// 存放热力图点的数组
		this.planeEnd;// 存放热度图的平面

		var grayShader = {
			uniforms: {
				radius: 1,
				// strength: s,
				u_maxClick: 1,
				u_minClick: 0.5,
				u_resolution: [window.innerWidth, window.innerHeight]
			},

			blending: BLEND_TYPE.ADD,
			vertexShader: `\
			#include <common_vert>
			varying vec3 vPosition;
			// attribute vec2 a_Uv;
			attribute mat4 rotateMatrix;
			attribute float strength;
			//varying vec2 vUv;
			varying float vStrength;
			varying float v_maxClick;
			varying float v_minClick;
			varying vec2 v_resolution;
			uniform float radius;
			uniform float u_maxClick;
			uniform float u_minClick;
			uniform vec2 u_resolution;
			void main(){
				gl_PointSize = radius * 2.0;\
				vPosition = a_Position;
				//vUv = a_Uv;
				vStrength = strength;
				v_maxClick = u_maxClick;\
				v_minClick = u_minClick;\
				v_resolution = u_resolution;
				vec4 transformed = vec4(a_Position, 1.0);
				//transformed = rotateMatrix * transformed;
				gl_Position = u_Projection * u_View * u_Model * transformed;
			}\
			`,
			fragmentShader: `\
			precision highp float;
			varying vec3 vPosition;
			varying float vStrength;
			varying float v_maxClick;
			varying float v_minClick;
			varying vec2 v_resolution;
			uniform float radius;
			// uniform float strength;

			void main(){
				float x = gl_FragCoord.x;\
				float y =  v_resolution[1]-gl_FragCoord.y;
				float dx = vPosition[0] - x;\
				float dy = vPosition[2] - y;\
				float distance = sqrt(dx*dx + dy*dy);\
				float diff = radius-distance;\
				float rate = 1.0 - length(vPosition) / radius;//根据点到原点的距离求渐变的色值
				float SigmaSquare =10.;
				float pxAlpha=0.0;
				if(v_maxClick>= vStrength && vStrength>= v_minClick){
					pxAlpha = (vStrength-v_minClick)/(v_maxClick-v_minClick);
				}
				if(vStrength>= v_maxClick){
					pxAlpha = 1.0;
				}

				float gaussianKernel = exp(-(dx*dx +dy*dy )/(2.*SigmaSquare *radius));
				gl_FragColor = vec4(1,0,0.,distance );
				//gl_FragColor = vec4(vec3(1.0), rate * vStrength);pxAlpha 1000.*pxAlpha* gaussianKernel
			}\
			`
		}
		const graymapPass = new ShaderPostPass(grayShader);
		// graymapPass.uniforms.luminosityThreshold = 0.5;
		// graymapPass.uniforms.tDiffuse = tempRenderTarget.texture;
		// graymapPass.render(renderer);
		if (this.dataSXY.length) {
			const pointGeometry = new Geometry();

			const vertices = [];
			for (let i = 0; i < this.dataSXY.length; i++) {
				vertices.push(this.dataSXY[i][1]);
				vertices.push(this.dataSXY[i][2]);
				vertices.push(0);
				vertices.push(this.dataSXY[i][0]);
			}
			var buffer = new Buffer(new Float32Array(vertices), 4);
			buffer.usage = BUFFER_USAGE.DYNAMIC_DRAW;
			const posAttribute = new Attribute(buffer, 3, 0);
			pointGeometry.addAttribute('a_Position', posAttribute);
			const HeatAttribute = new Attribute(buffer, 1, 3);
			pointGeometry.addAttribute('strength', HeatAttribute);

			var material = createMaterial(50.0, this.dataSXY[0][0]);

			const material1 = new BasicMaterial()
			material1.diffuse = new Color3(0xff0000);
			const pointMesh = new Mesh(pointGeometry, material);
			this.scene1.add(pointMesh);
		}
		var camera = new Camera();
		camera.position.set(0, 0, 10);
		camera.updateMatrix();
		camera.lookAt(new Vector3(0, 0, 0), new Vector3(0, 1, 0));
		camera.setOrtho(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / -2, window.innerHeight / 2, 0.1, 100);
		this.camera = camera


		if (this.dataSXY.length) {
			const pointGeometry = new Geometry();

			const vertices = [];
			for (let i = 0; i < this.dataSXY.length; i++) {
				vertices.push(this.dataSXY[i][1]);
				vertices.push(this.dataSXY[i][2]);
				vertices.push(0);
				vertices.push(this.dataSXY[i][0]);
			}
			var buffer = new Buffer(new Float32Array(vertices), 4);
			buffer.usage = BUFFER_USAGE.DYNAMIC_DRAW;
			const posAttribute = new Attribute(buffer, 3, 0);
			pointGeometry.addAttribute('a_Position', posAttribute);
			const HeatAttribute = new Attribute(buffer, 1, 3);
			pointGeometry.addAttribute('strength', HeatAttribute);

			var material = createMaterial(50.0, this.dataSXY[0][0]);

			const material1 = new BasicMaterial()
			material1.diffuse = new Color3(0xff0000);
			const pointMesh = new Mesh(pointGeometry, material);
			this.scene1.add(pointMesh);
		}

		const geometryplane = new PlaneGeometry(window.innerWidth, window.innerHeight);
		// const material1 = new BasicMaterial()
		// material1.diffuse = new Color3(0xff0000);
		const materialplane = createTexture(this.renderTarget1.texture);
		this.planeEnd = new Mesh(geometryplane, materialplane);
		this.planeEnd.euler.x = Math.PI / 2;
		this.planeEnd.matrixAutoUpdate = true;

		this.scene2.add(this.camera);
		this.scene2.add(this.planeEnd);


		function createMaterial(r, s) // 创建灰度图
		{
			let uniforms = {
				radius: r,
				// strength: s,
				u_maxClick: 1,
				u_minClick: 0.5,
				u_resolution: [window.innerWidth, window.innerHeight]
			};
			let meshMaterial = new ShaderMaterial({
				uniforms: uniforms,
				blending: BLEND_TYPE.ADD,
				vertexShader: `\
                #include <common_vert>
                varying vec3 vPosition;
                // attribute vec2 a_Uv;
				attribute mat4 rotateMatrix;
				attribute float strength;
                //varying vec2 vUv;
				varying float vStrength;
				varying float v_maxClick;
				varying float v_minClick;
				varying vec2 v_resolution;
				uniform float radius;
				uniform float u_maxClick;
				uniform float u_minClick;
				uniform vec2 u_resolution;
                void main(){
					gl_PointSize = radius * 2.0;\
					vPosition = a_Position;
                    //vUv = a_Uv;
					vStrength = strength;
					v_maxClick = u_maxClick;\
					v_minClick = u_minClick;\
					v_resolution = u_resolution;
					vec4 transformed = vec4(a_Position, 1.0);
					//transformed = rotateMatrix * transformed;
                    gl_Position = u_Projection * u_View * u_Model * transformed;
                }\
                `,
				fragmentShader: `\
                precision highp float;
                varying vec3 vPosition;
				varying float vStrength;
				varying float v_maxClick;
				varying float v_minClick;
				varying vec2 v_resolution;
                uniform float radius;
                // uniform float strength;

                void main(){
					float x = gl_FragCoord.x;\
					float y =  v_resolution[1]-gl_FragCoord.y;
					float dx = vPosition[0] - x;\
					float dy = vPosition[2] - y;\
					float distance = sqrt(dx*dx + dy*dy);\
					float diff = radius-distance;\
                    float rate = 1.0 - length(vPosition) / radius;//根据点到原点的距离求渐变的色值
					float SigmaSquare =10.;
					float pxAlpha=0.0;
					if(v_maxClick>= vStrength && vStrength>= v_minClick){
						pxAlpha = (vStrength-v_minClick)/(v_maxClick-v_minClick);
					}
					if(vStrength>= v_maxClick){
						pxAlpha = 1.0;
					}

					float gaussianKernel = exp(-(dx*dx +dy*dy )/(2.*SigmaSquare *radius));
					gl_FragColor = vec4(1,0,0.,distance );
                    //gl_FragColor = vec4(vec3(1.0), rate * vStrength);pxAlpha 1000.*pxAlpha* gaussianKernel
                }\
                `
			});
			meshMaterial.transparent = true;
			meshMaterial.drawMode = DRAW_MODE.POINTS;
			// meshMaterial.depthTest = true;
			// meshMaterial.depthWrite = false;
			return meshMaterial;
		}

		function createTexture(texture) // 创建热度图
		{
			let colormap = createGradient();
			let uniforms = {
				isAlpha: false,
				adjust: 1.0,
				grayTexture: texture,
				colorramp: colormap,
			};
			let meshMaterial = new ShaderMaterial({
				uniforms: uniforms,
				vertexShader: `\
                #include <common_vert>
                attribute vec2 a_Uv;
                varying vec2 vUv;
                #include <logdepthbuf_pars_vert>
                void main(){
                    vUv = a_Uv;
                    gl_Position = u_Projection * u_View * u_Model * vec4(a_Position,1.0);
                    #include <logdepthbuf_vert>
                }
                \
                `,
				fragmentShader: `\
                precision highp float;
                uniform bool isAlpha;
                uniform float adjust;
                uniform sampler2D grayTexture;
                uniform sampler2D colorramp;
                varying vec2 vUv;
                #include <logdepthbuf_pars_frag>
		        #include <fog_pars_frag>
                void main(){
                    #include <logdepthbuf_frag>
                    vec4 color1 = texture2D( grayTexture, vUv );
                    vec3 tarcolor1 =color1.rgb;
                    float f1 =color1.a;
                    
                    vec4 color2 = texture2D( colorramp, vec2(f1, 0.0) );
                    vec3 tarcolor2 =color2.rgb;
                    if(isAlpha){
                        gl_FragColor = vec4(tarcolor2, f1 * adjust);
                    }else{
                        gl_FragColor = vec4(tarcolor2, 1.0);
                    }
                    #include <fog_frag>
                }\
                `
			});
			meshMaterial.side = DRAW_SIDE.DOUBLE;
			return meshMaterial;
		}

		function createGradient() // 创建彩色渐变图
		{
			var myCanvas = document.createElement("canvas");
			myCanvas.width = 256;
			myCanvas.height = 1;
			var ctx = myCanvas.getContext('2d');

			// 创建渐变色
			var my_gradient = ctx.createLinearGradient(0, 0, 256, 0);
			my_gradient.addColorStop(0.4, "blue");
			my_gradient.addColorStop(0.6, "cyan");
			my_gradient.addColorStop(0.7, "lime");
			my_gradient.addColorStop(0.8, "yellow");
			my_gradient.addColorStop(1.0, "red");
			ctx.fillStyle = my_gradient; // 设置渐变色
			ctx.fillRect(0, 0, 256, 1); // 绘制矩形,起点xy和宽高

			var texture1 = new Texture2D();// THREE.CanvasTexture(ctx.canvas);
			texture1.image = ctx.canvas;
			texture1.version++;
			return texture1;
		}
	}



	_createCanvas() {
		if (typeof document !== 'undefined') {
			return document.createElement('canvas');
		} else {
			// create a new canvas instance in node.js
			// the canvas class needs to have a default constructor without any parameter
			return new this._canvas.constructor();
		}
	}
	update(renderer) {
		// 进入RenderTarget，开始渲染
		this.scene1.updateMatrix();
		this.scene1.updateRenderStates(this.camera);
		this.scene1.updateRenderQueue(this.camera);

		renderer.renderPass.renderTarget.setRenderTarget(this.renderTarget1);

		// const matricesAttribute = this.instancedGeometry.getAttribute('instanceMatrix');

		// for (let i = 0, il = matricesAttribute.buffer.count; i < il; i++) {
		// 	const offset = i * 16;
		// }

		// matricesAttribute.buffer.version++;

		renderer.renderPass.state.colorBuffer.setClear(0, 0, 0, 0);
		renderer.renderPass.clear(true, true, true);
		renderer.renderScene(this.scene1, this.camera);

		this.scene2.children[1].material.uniforms.grayTexture = this.renderTarget1.texture;
		this.scene2.updateMatrix();
		this.scene2.updateRenderStates(this.camera);
		this.scene2.updateRenderQueue(this.camera);
		renderer.renderPass.renderTarget.setRenderTarget(this.renderTarget2);

		renderer.renderPass.state.colorBuffer.setClear(0, 0, 0, 0);
		renderer.renderPass.clear(true, true, true);
		renderer.renderScene(this.scene2, this.camera);
	}

	setRadius(data) { // 设置热度图点半径
		this.planeData.forEach(function (e) {
			e.scale.set(1 * data, 1, 1 * data);
		})
	}

	setStrength(data) { // 设置热度图点强度
		this.planeData.forEach(function (e) {
			e.material.uniforms.s = data;
		})
	}

	getTexture() { // 获取热度图图片
		return this.renderTarget2.texture;
	}

	setRp(dataX, dataY) { // 设置分辨率
		this.renderTarget2.setSize(dataX, dataY);
	}

	setAlpha(bool, data) { // 调整是否透明以及透明度
		this.planeEnd.material.uniforms.isAlpha = bool;
		this.planeEnd.material.uniforms.adjust = data;
	}

}

export { heatMap };