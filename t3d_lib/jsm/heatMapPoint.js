import {
	Scene,
	PlaneGeometry,
	Geometry,
	Mesh,
	Camera,
	Vector3,
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
/*
* 1、创建一个数据集，存放多个热力图点、X坐标和Y坐标、强度
*
* 2、new一个heatMap对象，并将创建的数据集传入
*
* 3、在模型材质的map属性后调用getTexture()方法，将热度图贴到设置的地方
*
* 4、调用类中的update()方法，并将声明的WebGLRenderer传进去（此方法一定在render(scene, camera)前面调用，否则渲染不出来）
*
*/

class heatMap {

	constructor(param) {
		this._params = param;
		this._opacity = param['opacity'] !== undefined ? param['opacity'] : 1;
		this.width = param['width'] || window.innerWidth;
		this.height = param['height'] || window.innerHeight;

		this.minValue = param['minValue'] !== undefined ? param['minValue'] : 10;
		this.maxValue = param['maxValue'] !== undefined ? param['maxValue'] : 50;
		this._radius = param['radius'] || 0.8;
		this.blur = param['blur'] || 0.8;
		this.data = param['data'] || [];

		this._dataDirty = true;

		this._data = [];

		this._transparent =  param['transparent'] !== undefined ? param['transparent'] : false;

		this._grad = {};
		var gradCanvas = this._createCanvas();
		gradCanvas.width = 256;
		gradCanvas.height = 1;
		this._gradCtx = gradCanvas.getContext('2d');
		this._gradTexture = null;


		this.defaultRadius = 25,

		this.defaultGradient = {
			0.4: 'blue',
			0.6: 'cyan',
			0.7: 'lime',
			0.8: 'yellow',
			1.0: 'red'
		};

		var originalGradient = param['gradient'] || {
			0.4: 'blue',
			0.6: 'cyan',
			0.7: 'lime',
			0.8: 'yellow',
			1.0: 'red'
		};
		// var newGradient = {};
		// for (var key in originalGradient) {
		// 	var newKey = key;
		// 	if (key - 0 > 0.3) {
		// 		newKey = 0.7 + 0.3 * key;
		// 	}
		// 	newGradient[newKey] = originalGradient[key];
		// }
		this._grad = this._originalGrad = originalGradient;// newGradient

		this.dataXYS = param.data;// 存放热力点数据

		this._renderer = param.renderer;

		this._beforeSetup()
		this._draw()
	}
	_beforeSetup() {
		this.scene1 = new Scene();
		this.scene2 = new Scene();
		this.renderTarget1 = new RenderTarget2D(this.width, this.height);
		this.renderTarget2 = new RenderTarget2D(this.width, this.height);
		this.renderTarget1.texture.minFilter = WEBGL_TEXTURE_FILTER.LINEAR;
		this.renderTarget1.texture.magFilter = WEBGL_TEXTURE_FILTER.LINEAR;
		this.renderTarget1.texture.encoding = TEXEL_ENCODING_TYPE.GAMMA;
		this.renderTarget1.texture.generateMipmaps = false;

		this.renderTarget2.texture.minFilter = WEBGL_TEXTURE_FILTER.LINEAR;
		this.renderTarget2.texture.magFilter = WEBGL_TEXTURE_FILTER.LINEAR;
		this.renderTarget2.texture.encoding = TEXEL_ENCODING_TYPE.GAMMA;
		this.renderTarget2.texture.generateMipmaps = false;



		var camera = new Camera();
		camera.position.set(0, 0, 10);
		camera.updateMatrix();
		camera.lookAt(new Vector3(0, 0, 0), new Vector3(0, 1, 0));
		camera.setOrtho(this.width / -2, this.width / 2, this.height / -2, this.height / 2, 0.1, 100);
		this.camera = camera
	}

	_draw() {
		var that = this;
		if (this.dataXYS.length) {
			const pointGeometry = new Geometry();

			const vertices = [];
			for (let i = 0; i < this.dataXYS.length; i++) {
				vertices.push(this.dataXYS[i][0]);
				vertices.push(this.dataXYS[i][1]);
				vertices.push(0);
				vertices.push(this.dataXYS[i][2]);
			}
			var buffer = new Buffer(new Float32Array(vertices), 4);
			buffer.usage = BUFFER_USAGE.DYNAMIC_DRAW;
			const posAttribute = new Attribute(buffer, 3, 0);
			pointGeometry.addAttribute('a_Position', posAttribute);
			const HeatAttribute = new Attribute(buffer, 1, 3);
			pointGeometry.addAttribute('strength', HeatAttribute);

			var material = this._createGrayMaterial(this.radius);

			const material1 = new BasicMaterial()
			material1.diffuse = new Color3(0xff0000);
			const pointMesh = new Mesh(pointGeometry, material);
			this.scene1.children.forEach(function (e) {
				that.scene1.remove(e);
			})
			this.scene1.add(pointMesh);
		}

		const geometryplane = new PlaneGeometry(this.width, this.height);
		const heatMaterial = this._createHeatMaterial(this.renderTarget1.texture);
		var planeEnd = new Mesh(geometryplane, heatMaterial);
		planeEnd.euler.x = Math.PI / 2;
		planeEnd.matrixAutoUpdate = true;

		this.scene2.children.forEach(function (e) {
			that.scene2.remove(e);
		})
		this.scene2.add(this.camera);
		this.scene2.add(planeEnd);
	}
	_initParameter(param) {}

	setParameter(param) {}
	_setMaterial(param) {
		let material;
		let opacity = param['opacity'] !== undefined ? param['opacity'] : 1;

		if (param['type'] == 'mosaic') {
			material = new PointMosaicMaterial();
			material.uniforms['opacity'].value = opacity;
			material.uniforms['tDiffuse'].value = this._tex;
			material.isMosaic = true;
		} else {
			if (param['type'] == '3Dheatmap') {
				material = new Heatmap3DMaterial();
				material.uniforms['tDiffuse'].value = this._tex;
				material.uniforms['colormap'].value = this._colorRamp;
				material.uniforms['opacity'].value = opacity;
				material.uniforms['transparentCheck'].value = this._params.alpha;
				material.isMosaic = false;
			} else {
				material = new MeshBasicMaterial({
					map: this._tex,
					side: DoubleSide,
					transparent: true,
					depthTest: true,
				});
				material.isMosaic = false;
			}
		}
		this._material = material;
		this._mesh.material = material
	}
	_createGrayMaterial(radius) {
		let uniforms = {
			radius: radius,
			u_maxClick: this.maxValue,
			u_minClick: this.minValue,
			u_resolution: [this.width / 2, this.height / 2]
		};
		let meshMaterial = new ShaderMaterial({
			uniforms: uniforms,
			blending: BLEND_TYPE.ADD,
			vertexShader: `\
			#include <common_vert>
			attribute float strength;
			varying float vStrength;
			uniform float radius;
			uniform float u_maxClick;
			uniform float u_minClick;	
			void main(){
				gl_PointSize = radius *2. ;
				vStrength = strength;		
				vec4 transformed = vec4(a_Position, 1.0);
				gl_Position = u_Projection * u_View * u_Model * transformed;
			}\
			`,
			fragmentShader: `\
			precision highp float;
			varying float vStrength;
			uniform float radius;
			uniform float u_maxClick;
			uniform float u_minClick;
			void main(){
				float dx = gl_PointCoord.x -0.5;
				float dy = 1.-gl_PointCoord.y -0.5;
				float SigmaSquare =0.025;
				// SigmaSquare =0.045;
				float pxAlpha=0.0;
				if(u_maxClick>= vStrength && vStrength>= u_minClick){
					pxAlpha = (vStrength-u_minClick)/(u_maxClick-u_minClick);
				}
				if(vStrength>= u_maxClick){
					pxAlpha = 1.0;
				}
				float gaussianKernel = exp(-(dx*dx + dy*dy )/(2.*SigmaSquare ));
				gl_FragColor = vec4(0., 0.,0.,  pxAlpha*gaussianKernel );
			}\
			`
		});
		meshMaterial.transparent = true;
		meshMaterial.drawMode = DRAW_MODE.POINTS;
		meshMaterial.depthTest = true;
		meshMaterial.depthWrite = false;
		return meshMaterial;
	}

	_createHeatMaterial(texture) {
		let colormap =    this._gradient(this._grad);// this._createGradient(this._grad);//
		let uniforms = {
			transparent: this._transparent,
			opacity: this.opacity,
			grayTexture: texture,
			colormap: colormap,
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
			uniform bool transparent;
			uniform float opacity;
			uniform sampler2D grayTexture;
			uniform sampler2D colormap;
			varying vec2 vUv;
			#include <logdepthbuf_pars_frag>
			#include <fog_pars_frag>
			void main(){
				#include <logdepthbuf_frag>
				vec4 color1 = texture2D( grayTexture, vUv );
				vec3 tarcolor1 =color1.rgb;
				float f1 =color1.a;
				
				vec4 color2 = texture2D( colormap, vec2(  f1,0.5) );
				vec3 tarcolor2 =color2.rgb;
				if(transparent){
					gl_FragColor = vec4(tarcolor2, f1 * opacity);
				}else{
					gl_FragColor = vec4(tarcolor2, opacity);
				}
				// gl_FragColor = texture2D( colormap,vUv );;
				#include <fog_frag>
			}\
			`
		});
		meshMaterial.side = DRAW_SIDE.DOUBLE;
		return meshMaterial;
	}

	_getGradientCode(grad) {
		var code = "grad:(";
		for (var i in grad) {
			code += i + ":" + grad[i] + ",";
		}
		code += ")";

		return code;
	}
	_gradient(grad) {
		var code1 = this._getGradientCode(this._originalGrad);
		var code2 = this._getGradientCode(grad);

		if (code1 === code2 && this._gradTexture != null) {
			return this._gradTexture;
		}

		// create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
		var gradient = this._gradCtx.createLinearGradient(0, 0, 256, 0);
		for (var i in grad) {
			gradient.addColorStop(+i, grad[i]);
		}

		this._gradCtx.fillStyle = gradient;
		this._gradCtx.fillRect(0, 0, 256, 1);


		var texture1 = new Texture2D();
		texture1.image = this._gradCtx.canvas;
		texture1.version++;
		this._gradTexture = texture1;
		return texture1;
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

	addData(item) {
		this.dataXYS.push(item);
		this._draw();
	}
	setData(data) {
		this.dataXYS = data;
		this._draw();
	}
	/**
     * Get/Set whether the uninterpolated area is transparent
     * @param {Boolean} value is transparent or not
	 * @example
	 * heatMap.transparent=true
     */
	get transparent() {
		return this._transparent;
	}
	set transparent(value) {
		this._transparent = value;
		this._draw();
	}
	/**
     * Get/Set the opacity of one heat point
     * @param {Number} value is opacity value
	 * @example
	 * heatMap.opacity=0.5
     */
	get opacity() {
		return this._opacity;
	}
	set opacity(value) {
		this._opacity = value;
		this._draw();
	}

	/**
     * Get/Set the radius of one heat point
     * @param {Number} radius is radius value
	 * @example
	 * heatMap.transparent=true
     */
	get radius() {
		return this._radius;
	}
	set radius(radius) {
		this._radius = radius;
		// if (blur !== undefined) this.blur = blur;
		this._draw();
	}

	/**
	 * Set the color gradient, the color value can be set to a color value that can be recognized by css
	 * @param {Object} gradient
	 * @example
	 * heatMap.gradient={ 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
	 */
	get gradient() {
		return this._grad;
	}
	set gradient(gradient) {
		this._grad = gradient;
		this._draw();
	}

	/**
	 * Set random Data for heat map
	 * @example
	 * heatMap.randomData()
	 */
	randomData() {
		let params = this._params;
		let data = [];
		for (let i = 0; i < Math.round(params.width * params.height * 0.01); i++) {
			data.push([(Math.random() - 0.5) * params.width, (Math.random() - 0.5) * params.height, Math.pow(Math.random(), 3) * (params.maxValue - params.minValue) + params.minValue]);
		}
		this.setData(data);
	}


	update() {
		var renderer = this._renderer;
		// 进入RenderTarget，开始渲染
		this.scene1.updateMatrix();
		this.scene1.updateRenderStates(this.camera);
		this.scene1.updateRenderQueue(this.camera);

		renderer.renderPass.renderTarget.setRenderTarget(this.renderTarget1);

		renderer.renderPass.state.colorBuffer.setClear(0, 0, 0, 0);
		renderer.renderPass.clear(true, true, true);
		renderer.renderScene(this.scene1, this.camera);

		if (this.scene2.children[1] && this.scene2.children[1].type == "mesh") {
			this.scene2.children[1].material.uniforms.grayTexture = this.renderTarget1.texture;
		}
		this.scene2.updateMatrix();
		this.scene2.updateRenderStates(this.camera);
		this.scene2.updateRenderQueue(this.camera);
		renderer.renderPass.renderTarget.setRenderTarget(this.renderTarget2);

		renderer.renderPass.state.colorBuffer.setClear(0, 0, 0, 0);
		renderer.renderPass.clear(true, true, true);
		renderer.renderScene(this.scene2, this.camera);
	}


	getTexture() { // 获取热度图图片
		return this.renderTarget2.texture;
	}


	dispose() {
		super.dispose();
	}


	copy(source) {
		super.copy(source);

		return this;
	}


}

export { heatMap };