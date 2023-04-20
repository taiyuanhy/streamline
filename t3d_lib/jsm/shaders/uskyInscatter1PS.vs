
#include <common_vert>
attribute vec2 a_Uv;
varying vec2 v_Uv;			

const float PI = 3.1415926;

void main() {
	

	v_Uv = a_Uv;
	
	gl_Position = u_ProjectionView * u_Model * vec4(a_Position, 1.0);
	//gl_Position.z = gl_Position.w; // set z to camera.far
			
}