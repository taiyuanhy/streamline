import {
	Camera,
	Scene,
	PlaneGeometry,
	Color3,
	Vector3,
	Vector4, Texture2D, WEBGL_TEXTURE_WRAP, WEBGL_PIXEL_TYPE, WEBGL_PIXEL_FORMAT, WEBGL_TEXTURE_FILTER,
	TEXEL_ENCODING_TYPE,
	RenderTarget2D,
	ShaderMaterial,
	Mesh,
} from "../../../build/t3d.module.js";

const TRANSMITTANCE_WIDTH = 256;
const TRANSMITTANCE_HEIGHT = 64;
const INSCATTER_WIDTH = 256;
const INSCATTER_HEIGHT = 128;
export class uSkyPrecomputeUtil {

	constructor() {
		this.Transmittance2D = null;// new Texture2D();
		this.Inscatter2D = null;// new Texture2D();
		this.m_TransmittanceRT = null;// RenderTexture();
		this.m_InscatterRT = null;// RenderTexture();

		this.scene1 = new Scene();
		var camera = new Camera();
		camera.position.set(0, 10, 0);
		camera.updateMatrix();
		camera.lookAt(new Vector3(0, 0, 0), new Vector3(0, 1, 0));
		camera.setOrtho(TRANSMITTANCE_WIDTH / -2, TRANSMITTANCE_WIDTH / 2, TRANSMITTANCE_HEIGHT / -2, TRANSMITTANCE_HEIGHT / 2, 0.01, 1000);
		this.camera = camera
		this.scene1.add(this.camera)

		this.scene2 = new Scene();
		var camera2 = new Camera();
		camera2.position.set(0, 10, 0);
		camera2.updateMatrix();
		camera2.lookAt(new Vector3(0, 0, 0), new Vector3(0, 1, 0));
		camera2.setOrtho(INSCATTER_WIDTH / -2, INSCATTER_WIDTH / 2, INSCATTER_HEIGHT / -2, INSCATTER_HEIGHT / 2, 0.01, 1000);
		this.camera2 = camera2;
		this.scene2.add(this.camera2)

		var vshader1 = './jsm/Shaders/uskyTransmittance.vs';
		var fshader1 = './jsm/Shaders/uskyTransmittance.fs';

		this.transmittanceMatial = new ShaderMaterial({

			vertexShader: $.ajax(vshader1, { async: false }).responseText,
			fragmentShader: $.ajax(fshader1, { async: false }).responseText,
			uniforms: {
				"betaR": [5.8e-3, 1.35e-2, 3.31e-2, 0],
				"RES_R": 1
			}
		});

		var vshader = './jsm/Shaders/uskyInscatter1PS.vs';
		var fshader = './jsm/Shaders/uskyInscatter1PS.fs';

		this.inscatterMatial = new ShaderMaterial({

			vertexShader: $.ajax(vshader, { async: false }).responseText,
			fragmentShader: $.ajax(fshader, { async: false }).responseText,
			uniforms: {

				"betaR": [5.8e-3, 1.35e-2, 3.31e-2, 0],
				"_Transmittance": null,
				"RES_R": 4
			}
		});
	}
	Lerp(a, b, t) {
		if (t <= 0) {
			return a;
		} else if (t >= 1) {
			return b;
		}
		return a + (b - a) * t;
	}
	Clamp(x, min, max) {
		if (x > max) { return max; }
		if (x < min) { return min; }
		return x;
	}

	// Create two Texture2D to cache the final precomputed texture data
	PrecomputeTextureResource(TotalInscatterTextureHeight) {
		if (!Transmittance2D) {
			// Transmittance2D = new Texture2D (TRANSMITTANCE_WIDTH, TRANSMITTANCE_HEIGHT, TextureFormat.RGBAHalf, false, true );
			// Transmittance2D.anisoLevel = 0;
			// Transmittance2D.name = "Transmittance2D";
			// Transmittance2D.hideFlags = HideFlags.DontSave;

			Transmittance2D = new Texture2D();
			Transmittance2D.wrapS = Transmittance2D.wrapT = WEBGL_TEXTURE_WRAP.CLAMP_TO_EDGE;
			Transmittance2D.image =  { data: null, width: TRANSMITTANCE_WIDTH, height: TRANSMITTANCE_HEIGHT };
			Transmittance2D.version++;

			Transmittance2D.type = WEBGL_PIXEL_TYPE.UNSIGNED_SHORT; // UNSIGNED_SHORT, UNSIGNED_INT
			Transmittance2D.format = WEBGL_PIXEL_FORMAT.RGB;
			Transmittance2D.internalformat = WEBGL_PIXEL_FORMAT.DEPTH_COMPONENT24;
			Transmittance2D.magFilter = WEBGL_TEXTURE_FILTER.LINEAR;// NEAREST
			Transmittance2D.minFilter = WEBGL_TEXTURE_FILTER.LINEAR;
			Transmittance2D.generateMipmaps = false;
		}

		if (Inscatter2D && Inscatter2D.height != TotalInscatterTextureHeight) {
			// Inscatter2D.Reinitialize(INSCATTER_WIDTH, TotalInscatterTextureHeight);
			return;
		} else
		if (!Inscatter2D) {
			// Inscatter2D = new Texture2D (INSCATTER_WIDTH, TotalInscatterTextureHeight, TextureFormat.RGBAHalf, false, true );
			// Inscatter2D.wrapMode = TextureWrapMode.Clamp;
			// Inscatter2D.anisoLevel = 0;
			// Inscatter2D.name = "inscatter2D";
			// Inscatter2D.hideFlags = HideFlags.DontSave;

			Inscatter2D = new Texture2D();
			Inscatter2D.wrapS = Inscatter2D.wrapT = WEBGL_TEXTURE_WRAP.CLAMP_TO_EDGE;
			Inscatter2D.image =  { data: null, width: TRANSMITTANCE_WIDTH, height: TotalInscatterTextureHeight };
			Inscatter2D.version++;

			Inscatter2D.type = WEBGL_PIXEL_TYPE.UNSIGNED_SHORT; // UNSIGNED_SHORT, UNSIGNED_INT
			Inscatter2D.format = WEBGL_PIXEL_FORMAT.RGB;
			Inscatter2D.internalformat = WEBGL_PIXEL_FORMAT.DEPTH_COMPONENT24;
			Inscatter2D.magFilter = WEBGL_TEXTURE_FILTER.LINEAR;// NEAREST
			Inscatter2D.minFilter = WEBGL_TEXTURE_FILTER.LINEAR;
			Inscatter2D.generateMipmaps = false;
		}
	}
	// Beta Rayleigh density (Beta R)
	Lambda(Wavelengths, SkyTint, AtmosphereThickness) {
		// Sky Tint shifts the value of Wavelengths
		var variableRangeWavelengths =
			new Vector3(this.Lerp(Wavelengths.x + 150, Wavelengths.x - 150, SkyTint.r),
				this.Lerp(Wavelengths.y + 150, Wavelengths.y - 150, SkyTint.g),
				this.Lerp(Wavelengths.z + 150, Wavelengths.z - 150, SkyTint.b));

		variableRangeWavelengths.x = this.Clamp(variableRangeWavelengths.x, 380, 780);
		variableRangeWavelengths.y = this.Clamp(variableRangeWavelengths.y, 380, 780);
		variableRangeWavelengths.z = this.Clamp(variableRangeWavelengths.z, 380, 780);

		// Evaluate Beta Rayleigh function is based on A.J.Preetham

		var WL = variableRangeWavelengths.multiplyScalar(1e-9); // nano meter unit

		var n = 1.0003; // the index of refraction of air
		var N = 2.545e25; // molecular density at sea level
		var pn = 0.035; // depolatization factor for standard air

		var waveLength4 = new Vector3(Math.pow(WL.x, 4), Math.pow(WL.y, 4), Math.pow(WL.z, 4));
		var delta =  waveLength4.multiplyScalar(3.0 * N * (6.0 - 7.0 * pn));
		var ray = (8 * Math.pow(Math.PI, 3) * Math.pow(n * n - 1.0, 2) * (6.0 + 3.0 * pn));
		var betaR = new Vector3(ray / delta.x, ray / delta.y, ray / delta.z);

		// Atmosphere Thickness ( Rayleigh ) scale
		var Km = 1000.0; // kilo meter unit
		betaR = betaR.multiplyScalar(Km * AtmosphereThickness);

		// w channel solves the Rayleigh Offset artifact issue
		return new Vector4(betaR.x, betaR.y, betaR.z, Math.max(Math.pow(AtmosphereThickness, Math.PI), 1));
	}

	// Due to PS4 and WebGL have problem on Texture2D ReadPixels for float format RenderTexture.
	// We uses the RenderTexture directly for the precomputed data for these runtime build
	StartPrecomputeRT(pSetting, renderer) {
		if (!this.transmittanceMatial || !this.inscatterMatial) { return; }

		const TRANSMITTANCE_WIDTH = 256;
		const TRANSMITTANCE_HEIGHT = 64;

		const SCATTERING_TEXTURE_WIDTH = 256;
		const SCATTERING_TEXTURE_HEIGHT = 128;
		// const SCATTERING_TEXTURE_DEPTH = 32;

		const plane_geometry1 = new PlaneGeometry(TRANSMITTANCE_WIDTH, TRANSMITTANCE_HEIGHT);
		const plane1 = new Mesh(plane_geometry1, this.transmittanceMatial);
		plane1.position.y = -1;
		plane1.receiveShadow = true;
		this.scene1.add(plane1);

		const plane_geometry2 = new PlaneGeometry(SCATTERING_TEXTURE_WIDTH, SCATTERING_TEXTURE_HEIGHT);
		const plane2 = new Mesh(plane_geometry2, this.inscatterMatial);
		plane2.position.y = -1;
		plane2.receiveShadow = true;
		this.scene2.add(plane2);

		var TotalInscatterTextureHeight = INSCATTER_HEIGHT * pSetting.inscatterAltitudeSample;

		// InitPrecomputeUniform((int)pSetting.inscatterAltitudeSample,Lambda (pSetting.wavelengths, pSetting.skyTint, pSetting.atmosphereThickness));
		var lambda = this.Lambda(pSetting.wavelengths, pSetting.skyTint, pSetting.atmosphereThickness)
		// this.transmittanceMatial.uniforms.RES_R = pSetting.inscatterAltitudeSample;
		// this.transmittanceMatial.uniforms.betaR = lambda.toArray();
		this.inscatterMatial.uniforms.RES_R = pSetting.inscatterAltitudeSample;
		this.inscatterMatial.uniforms.betaR = lambda.toArray();
		// liufang start
		// InitPrecomputeUniform(pSetting.inscatterAltitudeSample,Lambda(pSetting.wavelengths, pSetting.skyTint, pSetting.groundColor, pSetting.atmosphereThickness));
		// liufang end

		// Transmittance Texture ---------------------&& m_TransmittanceRT.IsCreated()
		if (this.m_TransmittanceRT != null) {
			// m_TransmittanceRT.DiscardContents ();
		} else {
			// m_TransmittanceRT = new RenderTexture (TRANSMITTANCE_WIDTH, TRANSMITTANCE_HEIGHT, 0, RenderTextureFormat.ARGBHalf);
			// m_TransmittanceRT.wrapMode = TextureWrapMode.Clamp;
			// m_TransmittanceRT.autoGenerateMips = false;
			// m_TransmittanceRT.anisoLevel = 0;
			// m_TransmittanceRT.MarkRestoreExpected ();
			// m_TransmittanceRT.hideFlags = HideFlags.HideAndDontSave;
			// m_TransmittanceRT.Create();

			this.m_TransmittanceRT = new RenderTarget2D(TRANSMITTANCE_WIDTH, TRANSMITTANCE_HEIGHT);
			this.m_TransmittanceRT.texture.minFilter = WEBGL_TEXTURE_FILTER.LINEAR;
			this.m_TransmittanceRT.texture.magFilter = WEBGL_TEXTURE_FILTER.LINEAR;
			this.m_TransmittanceRT.texture.encoding = TEXEL_ENCODING_TYPE.GAMMA;
			this.m_TransmittanceRT.texture.generateMipmaps = false;
		}

		// Graphics.Blit (null, m_TransmittanceRT, pMaterial, 0);

		// var renderer = _renderer;
		// 进入RenderTarget，开始渲染

		renderer.renderPass.renderTarget.setRenderTarget(this.m_TransmittanceRT);
		renderer.renderPass.state.colorBuffer.setClear(0, 0, 0, 0);
		renderer.renderPass.clear(true, true, true);
		this.scene1.updateMatrix();
		this.scene1.updateRenderStates(this.camera);
		this.scene1.updateRenderQueue(this.camera);
		renderer.renderScene(this.scene1, this.camera);

		// Inscatter Texture ------------------------- && m_InscatterRT.IsCreated()
		if (this.m_InscatterRT != null && this.m_InscatterRT.height == TotalInscatterTextureHeight) {
			// m_InscatterRT.DiscardContents ();
		} else {
			// m_InscatterRT = new RenderTexture (INSCATTER_WIDTH, TotalInscatterTextureHeight, 0, RenderTextureFormat.ARGBHalf);
			// m_InscatterRT.wrapMode = TextureWrapMode.Clamp;
			// m_InscatterRT.autoGenerateMips = false;
			// m_InscatterRT.anisoLevel = 0;
			// m_InscatterRT.MarkRestoreExpected ();
			// m_InscatterRT.hideFlags = HideFlags.HideAndDontSave;
			// m_InscatterRT.Create ();

			this.m_InscatterRT = new RenderTarget2D(TRANSMITTANCE_WIDTH, TotalInscatterTextureHeight);
			this.m_InscatterRT.texture.minFilter = WEBGL_TEXTURE_FILTER.LINEAR;
			this.m_InscatterRT.texture.magFilter = WEBGL_TEXTURE_FILTER.LINEAR;
			this.m_InscatterRT.texture.encoding = TEXEL_ENCODING_TYPE.GAMMA;
			this.m_InscatterRT.texture.generateMipmaps = false;
		}
		// Blit(Texture source, RenderTexture dest, Material mat, int pass = -1);
		// Graphics.Blit (m_TransmittanceRT, m_InscatterRT, pMaterial, 1);


		renderer.renderPass.renderTarget.setRenderTarget(this.m_InscatterRT);
		this.inscatterMatial.uniforms._Transmittance = this.m_TransmittanceRT.texture;
		renderer.renderPass.state.colorBuffer.setClear(0, 0, 0, 0);
		renderer.renderPass.clear(true, true, true);
		this.scene2.updateMatrix();
		this.scene2.updateRenderStates(this.camera2);
		this.scene2.updateRenderQueue(this.camera2);
		renderer.renderScene(this.scene2, this.camera2);

		return {
			transmittanceRT: this.m_TransmittanceRT.texture,
			inscatterRT: this.m_InscatterRT.texture
		}

		// pMaterial.uniforms._Transmittance = this.m_TransmittanceRT.texture;
		// pMaterial.uniforms._Inscatter = this.m_InscatterRT.texture;
		// m_TransmittanceRT.SetGlobalShaderProperty ("_Transmittance");
		// m_InscatterRT.SetGlobalShaderProperty ("_Inscatter");
	}

}