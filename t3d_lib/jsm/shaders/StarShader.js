const StarShader = {

	uniforms: {
		'normalMap': null,
		'opacity': 1.0,
		'size': [0.3, 0.3],
		'distortionScale': 15.0,
		'sunColor': [1, 1, 1],
		'LightPosition': [0.70707, 0.70707, 0],
		'time': 0.0,
		'offset': [0, 0],
		'waterColor': [0, 0.3, 0.5],
		'waveStrength': 1.0,
		'reflectWeight': 1.0,
		'envMap': null,
		'envMapFlip': -1,
		'envQuaternion': [0, 0, 0, 1],
	},

	vertexShader: [
		"attribute vec3 a_Position;",
		"attribute vec2 a_Uv;",
		"uniform mat4 u_ProjectionView;",
		"uniform mat4 u_Model;",
		"uniform mat4 _StarRotationMatrix;",
		"uniform float _StarIntensity;",
		"uniform float time;",

		"attribute mat4 instanceMatrix;",
		"attribute vec4 instanceColor;",

		"varying vec2 vUv;",
		"varying vec4 vColor;",

		"float GetFlickerAmount(vec2 pos)",
		"{",
		"    vec2 tab[8];",
		"    tab[0]= vec2(0.897907815,-0.347608525);",
		"    tab[1]= vec2(0.550299290, 0.273586675);",
		"    tab[2]= vec2(0.823885965, 0.098853070);",
		"    tab[3]= vec2(0.922739035,-0.122108860);",
		"    tab[4]= vec2(0.800630175,-0.088956800);",
		"    tab[5]= vec2(0.711673375, 0.158864420);",
		"    tab[6]= vec2(0.870537795, 0.085484560);",
		"    tab[7]= vec2(0.956022355,-0.058114540);",
		"    vec2 hash = fract(pos.xy * 256.);",
		"    float index = fract(hash.x + (hash.y + 1.) * time); // flickering speed",
		"    index *= 8.;",

		"    float f = fract(index)* 2.5;",
		"    highp int i = int(index);//floor(index);//",

		"    // using default const tab array. ",
		"    // occasionally this is not working for WebGL and some android build",
		"    return tab[i].x + f * tab[i].y;",
		"}	",
		"void main(){",

		"    vec3 t = (_StarRotationMatrix * vec4(a_Position.xyz,1.)).xyz;// + _WorldSpaceCameraPos.xyz;", 
		"    vec4  ColorAndMag = instanceColor;",
		"    float appMag = 6.5 + ColorAndMag.w * (-1.44 -1.5);",

		"    vec4 transformed = vec4(t, 1.0);",
		"    transformed = instanceMatrix * transformed;",
		"    float brightness = GetFlickerAmount(transformed.xz) * pow(5.0, (-appMag -1.44)/ 2.5);",
		
		"    vColor = _StarIntensity * vec4( brightness *ColorAndMag.xyz, brightness );",
		"    vUv = 6.5 * a_Uv - 6.5 * vec2(0.5, 0.5);",
			
		"    gl_Position = u_ProjectionView * u_Model * transformed;",
		"}",
	].join("\n"),

	fragmentShader: [
		"varying vec2 vUv;",
		"varying vec4 vColor;",
		"uniform float _StarIntensity;",
		"uniform float time;",

		"uniform sampler2D map;",

		"void main() {",
		"    vec2 distCenter = vUv;",
		"    float scale = exp(-dot(distCenter, distCenter));",
		"    vec3 col = vColor.xyz * scale + 5. * vColor.w * pow(scale, 10.);",

		"    gl_FragColor = vec4(col,1.);//texture2D(map, vUv);",
		"}",
				
	].join("\n")

}

export { StarShader };