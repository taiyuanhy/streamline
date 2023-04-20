import {
	Scene,
	PlaneGeometry,
	Mesh,
	Camera,
	Vector3,
	Vector4,
	Quaternion,
	Matrix4,
	BLEND_TYPE,
	ShaderMaterial,
	Texture2D,
	DRAW_SIDE,
	RenderTarget2D,
	Attribute,
	Buffer,
	WEBGL_TEXTURE_FILTER,
	TEXEL_ENCODING_TYPE


} from "../../build/t3d.module.js";

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
		// this._transformedData = [];

		// this._canvasWidth = this._areaWidth = this._canvas.width;
		// this._canvasHeight = this._areaHeight = this._canvas.height;

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

		var camera = new Camera();
		camera.position.set(0, 10, 0);
		camera.updateMatrix();
		camera.lookAt(new Vector3(0, 0, 0), new Vector3(0, 0, -1));
		camera.setOrtho(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / -2, window.innerHeight / 2, 0.1, 100);
		this.camera = camera

		// const instances = 5000;

		// const geometry = new t3d.CubeGeometry(3, 3, 3);
		// const instancedGeometry = createInstancedGeoemtry(geometry);
		// instancedGeometry.instanceCount = instances;

		// const instancedMesh = new t3d.Mesh(instancedGeometry, shaderMaterial);
		// instancedMesh.frustumCulled = false;
		// scene.add(instancedMesh);


		if (this.dataSXY.length) {
			const squareGeometry = new PlaneGeometry(20, 20);
			this.instancedGeometry = this._createInstancedGeoemtry(squareGeometry, this.dataSXY);
			this.instancedGeometry.instanceCount = this.dataSXY.length;
			const material = createMaterial(10.0, this.dataSXY[0][0]);
			const instancedMesh = new Mesh(this.instancedGeometry, material);
			// instancedMesh.frustumCulled = false;
			this.scene1.add(instancedMesh);
			// this.dataSXY.forEach(element => {
			// 	const material = createMaterial(10.0, element[0]);
			// 	const planeR = new Mesh(squareGeometry, material);
			// 	planeR.position.set(element[1], 0, element[2]);
			// 	this.scene1.add(planeR);
			// 	this.planeData.push(planeR)
			// });
		}

		const geometryplane = new PlaneGeometry(window.innerWidth, window.innerHeight);
		const materialplane = createTexture(this.renderTarget1.texture);
		this.planeEnd = new Mesh(geometryplane, materialplane);

		this.scene2.add(this.camera);
		this.scene2.add(this.planeEnd);


		function createMaterial(r, s) // 创建灰度图
		{
			let uniforms = {
				radius: r,
				strength: s,
			};
			let meshMaterial = new ShaderMaterial({
				uniforms: uniforms,
				blending: BLEND_TYPE.add,
				vertexShader: `\
                #include <common_vert>
                varying vec3 vPosition;
                attribute vec2 a_Uv;
				attribute mat4 instanceMatrix;
				attribute float strength;
                varying vec2 vUv;
				varying float vStrength;
                void main(){
					vPosition = a_Position;
                    vUv = a_Uv;
					vStrength = strength;
					vec4 transformed = vec4(a_Position, 1.0);
					transformed = instanceMatrix * transformed;
                    gl_Position = u_Projection * u_View * u_Model * transformed;
                }\
                `,
				fragmentShader: `\
                precision highp float;
                varying vec3 vPosition;
                uniform float radius;
                uniform float strength;
				varying float vStrength;
                void main(){
                    float rate = 1.0 - length(vPosition) / radius;//根据点到原点的距离求渐变的色值
                    gl_FragColor = vec4(vec3(1.0), rate * vStrength);
                }\
                `
			});
			meshMaterial.transparent = true;
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

		// this.grayPass = new ShaderPostPass(grayShader);
		// this.heatPass = new ShaderPostPass(heatShader);
	}
	_createInstancedGeoemtry(geometry, dataSXY) {
		const matrices = [];
		const strength = [];

		const vector = new Vector4();
		let x, y, z, w;

		const position = new Vector3();
		const orientation = new Quaternion();
		const scale = new Vector3();
		const matrix = new Matrix4();

		for (let i = 0; i < this.dataSXY.length; i++) {
			position.x = dataSXY[i][1];
			position.y = 0;
			position.z = dataSXY[i][2];
			// position.x = Math.random() * 100 - 50;
			// position.y = Math.random() * 100 - 50;
			// position.z = Math.random() * 100 - 50;
			// orientation.x = Math.random() * 2 - 1;
			// orientation.y = Math.random() * 2 - 1;
			// orientation.z = Math.random() * 2 - 1;
			// orientation.w = Math.random() * 2 - 1;
			// orientation.normalize();

			scale.set(1, 1, 1);

			matrix.transform(position, scale, orientation);
			matrix.toArray(matrices, i * 16);
			strength.push(dataSXY[i][0]);
		}

		var instancedGeometry = geometry.clone();
		const instanceMatrixAttribute = new Attribute(new Buffer(new Float32Array(matrices), 16));
		instanceMatrixAttribute.divisor = 1;
		instancedGeometry.addAttribute('instanceMatrix', instanceMatrixAttribute);
		const instanceHeatAttribute = new Attribute(new Buffer(new Float32Array(strength), 1));
		instanceHeatAttribute.divisor = 1;
		instancedGeometry.addAttribute('strength', instanceHeatAttribute);

		return instancedGeometry;
	}
	data(inputdata) {
		this._data = inputdata;
		this._dataDirty = true;
		return this;
	}
	add(point) {
		this._data.push(point);
		this._dataDirty = true;
		return this;
	}
	clear() {
		this._data = [];
		this._dataDirty = true;
		return this;
	}
	max(max) {
		if (this._max !== max) {
			this._max = max;
			this._dataDirty = true;
		}
		return this;
	}
	min(min) {
		if (this._min !== min) {
			this._min = min;
			this._dataDirty = true;
		}
		return this;
	}

	// setCanvasSize(width, height) {
	// 	if (this._canvasWidth !== width || this._canvasHeight !== height) {
	// 		this._canvasWidth = this._canvas.width = width;
	// 		this._canvasHeight = this._canvas.height = height;

	// 		this._dataDirty = true;
	// 	}

	// 	return this;
	// }

	// setAreaSize(width, height) {
	// 	if (this._areaWidth !== width || this._areaHeight !== height) {
	// 		this._areaWidth = width;
	// 		this._areaHeight = height;

	// 		this._dataDirty = true;
	// 	}

	// 	return this;
	// }

	alpha(a) {
		this._alpha = a;
		return this;
	}

	radius(r, blur) {
		blur = (blur !== undefined) ? blur : 15;

		if (r === this._radius && blur === this._blur) {
			return this;
		}

		this._radius = r;
		this._blur = blur;
		this._r = this._radius + this._blur;

		// create a grayscale blurred circle image that we'll use for drawing points
		var circle = this._circle;
		var ctx = this._cirCtx;

		circle.width = circle.height = this._r * 2;

		ctx.shadowOffsetX = ctx.shadowOffsetY = this._r * 2;
		ctx.shadowBlur = blur;
		ctx.shadowColor = 'black';

		ctx.beginPath();
		ctx.arc(-this._r, -this._r, r, 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.fill();

		return this;
	}

	gradient(grad) {
		var code1 = this._getGradientCode(this._grad);
		var code2 = this._getGradientCode(grad);

		if (code1 === code2) {
			return this;
		}

		this._grad = Object.assign({}, grad); // clone

		if (this._gradCache[code2]) {
			this._gradData = this._gradCache[code2];
			return this;
		}

		// create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
		var gradient = this._gradCtx.createLinearGradient(0, 0, 0, 256);
		for (var i in grad) {
			gradient.addColorStop(+i, grad[i]);
		}

		this._gradCtx.fillStyle = gradient;
		this._gradCtx.fillRect(0, 0, 1, 256);

		this._gradData = this._gradCtx.getImageData(0, 0, 1, 256).data;
		this._gradCache[code2] = this._gradData;

		return this;
	}

	draw(colorize) {
		if (this._r === 0) this.radius(this.defaultRadius);
		if (!this._gradData) this.gradient(this.defaultGradient);

		if (this._dataDirty) {
			this._transformData();
		}

		var ctx = this._ctx;

		ctx.clearRect(0, 0, this._canvasWidth, this._canvasHeight);

		// draw a grayscale heatmap by putting a blurred circle at each data point
		for (var i = 0, len = this._transformedData.length, p; i < len; i++) {
			p = this._transformedData[i];
			ctx.globalAlpha = p[2];
			ctx.drawImage(this._circle, p[0] - this._r, p[1] - this._r);
		}

		// colorize the heatmap, using opacity value of each pixel to get the right color from our gradient
		var colored = ctx.getImageData(0, 0, this._canvasWidth, this._canvasHeight);
		if (colorize) // 3Dheatmap dont need to _colorize;
		{ this._colorize(colored.data, this._gradData, this._alpha); }
		// ctx.putImageData(colored, 0, 0);


		return colored.data;
	}

	getValueAt(point) {
		var value;
		var shadowCtx = this._ctx;
		var img = shadowCtx.getImageData(point.x, point.y, 1, 1);
		var data = img.data[3];
		var max = this._max;
		var min = this._min;

		value = (Math.abs(max - min) * (data / 255)) >> 0;

		return value;
	}

	_transformData() {
		this._transformedData = [];

		var scaleXFactor = this._canvasWidth / this._areaWidth;
		var scaleYFactor = this._canvasHeight / this._areaHeight;

		var scope = this;

		this._data.map(function(d) {
			var x = d[0];
			var y = d[1];

			x = x * scaleXFactor + scope._canvasWidth / 2;
			y = y * scaleYFactor + scope._canvasHeight / 2;
			var a = Math.min(Math.max((d[2] - scope._min) / (scope._max - scope._min), 0.05), 1);

			scope._transformedData.push([x, y, a]);
		});
	}

	_colorize(pixels, gradient, alpha) {
		for (var i = 0, len = pixels.length, j; i < len; i += 4) {
			j = pixels[i + 3] * 4; // get gradient color from opacity value
			if (alpha && j === 0) { // optimize
				continue;
			}

			pixels[i] = gradient[j];
			pixels[i + 1] = gradient[j + 1];
			pixels[i + 2] = gradient[j + 2];
			if (!alpha) {
				pixels[i + 3] = 255;
			}
		}
	}

	_getGradientCode(grad) {
		var code = "grad:(";
		for (var i in grad) {
			code += i + ":" + grad[i] + ",";
		}
		code += ")";

		return code;
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

		const matricesAttribute = this.instancedGeometry.getAttribute('instanceMatrix');

		for (let i = 0, il = matricesAttribute.buffer.count; i < il; i++) {
			const offset = i * 16;

			// matrix.fromArray(matricesAttribute.buffer.array, offset);
			// matrix.multiply(rotationMatrix);

			// matrix.toArray(matricesAttribute.buffer.array, offset);
		}

		matricesAttribute.buffer.version++;

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

		// 渲染完RenderTarget后置空跳出，然后渲染WebGLRenderer
		// renderer.renderPass.renderTarget.setRenderTarget(null);


		// renderer.setRenderTarget(this.renderTarget1);
		// renderer.render(this.scene1, camera);
		// renderer.setRenderTarget(this.renderTarget2);
		// renderer.render(this.scene2, camera);
		// // 渲染完RenderTarget后置空跳出，然后渲染WebGLRenderer
		// renderer.setRenderTarget(null);
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