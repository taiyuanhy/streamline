import * as t3d from 't3d';
function visData(dataurl,vertexData){
    // const vertexData1 =vertexData;
    fetch(dataurl)
        .then(res => res.blob())
        .then(blob => {
            const reader = new FileReader();
            reader.readAsText(blob);
            reader.onload = function(e) {
                if(waterMesh === undefined)  {addWaterMesh(vertexData);}
                const attriValueArrayStr=e.target.result.split(" ");
                const attriValueArray = [];	
                attriValueArrayStr.forEach(element => {
                    attriValueArray.push( Number(element ))
                });
                
                const nodeAttriValue =[];
                let maxAttriValue = -Infinity;
                let minAttriValue = Infinity;
                for (let i = 0; i < vertexData.position.length/3; i++) {

                    let sumAttriValue =0;
                    for (let k = 0; k < elementArray[i].length; k++) {
                        sumAttriValue += attriValueArray[k];
                    }
                    nodeAttriValue[i] = sumAttriValue / elementArray[i].length;
                    if(nodeAttriValue[i] > maxAttriValue ) {maxAttriValue = nodeAttriValue[i];}
                    if(nodeAttriValue[i] < minAttriValue ) {minAttriValue = nodeAttriValue[i];}
                }
                
                const bytesArray = new Float32Array(nodeAttriValue);
                const buffer4 = new  t3d.Buffer(bytesArray, 1);
                buffer4.usage = t3d.BUFFER_USAGE.DYNAMIC_DRAW;
                waterMesh.geometry.addAttribute('a_value', new  t3d.Attribute(buffer4, 1));
                // waterMesh.geometry.attributes.a_value.buffer.array = bytesArray;
                waterMesh.material.uniforms.u_maxvalue= maxAttriValue;
                waterMesh.material.needsUpdate = true;
            }
            
        });
}

function addWaterMesh(vertexData) {

    let topGeometry =  new t3d.Geometry();
    const buffer = new t3d.Buffer(new Float32Array(vertexData.position), 3);
    buffer.usage =  t3d.BUFFER_USAGE.DYNAMIC_DRAW;
    topGeometry.addAttribute('a_Position', new  t3d.Attribute(buffer, 3));

    // for (let i = 0; i < vertexData.position.length/3; i++) {
    // 	vertexData.normal.push(0);
    // 	vertexData.normal.push(1);
    // 	vertexData.normal.push(0);
    // }


    // var buffer2 = new t3d.Buffer(new Float32Array(vertexData.normal), 3);
    // buffer2.usage = t3d.BUFFER_USAGE.DYNAMIC_DRAW;
    // topGeometry.addAttribute('a_Normal', new t3d.Attribute(buffer2, 3));

    // const buffer3 = new  t3d.Buffer(new Float32Array(vertexData.uv), 2);
    // buffer3.usage = t3d.BUFFER_USAGE.DYNAMIC_DRAW;
    // topGeometry.addAttribute('a_Uv', new  t3d.Attribute(buffer3, 2));

    if (vertexData.index) {
        topGeometry.setIndex(new  t3d.Attribute(new  t3d.Buffer(
            (vertexData.position.length / 3) > 65536 ? new Uint32Array(vertexData.index) : new Uint16Array(vertexData.index),
            1
        )));
    }
    topGeometry.computeBoundingBox();
    topGeometry.computeBoundingSphere();

    // const lambert = new t3d.LambertMaterial();
    // lambert.side = t3d.DRAW_SIDE.DOUBLE;
    // lambert.diffuse.setHex(0xff0000);

    var ScreenMaterial = new t3d.ShaderMaterial({
        defines: {
        },
        vertexShader: `\
        #include <common_vert>
        precision mediump float;
        attribute vec2 a_Uv;
        attribute float a_value;
        varying float v_value;
        varying float v_position;
        varying vec2 v_uv;
        
        void main() {
            v_uv = a_Uv;
            v_value = a_value;
            v_position = a_Position.y;
            vec4 position =vec4( a_Position.x,a_Position.y+a_value,a_Position.z, 1);
            gl_Position = u_ProjectionView * u_Model * position;
        }
        
        `,
        fragmentShader: `\
        #include <common_frag>
        precision mediump float;
        varying float v_value;
        uniform sampler2D u_screen;
        varying float v_position;
        uniform float u_maxvalue;
        varying vec2 v_uv;
        
        vec3  heatColorMap(float t)
        {
            t *= 3.;
            return clamp(vec3(min(t-1.5, 4.5-t), 
                            min(t-0.5, 3.5-t), 
                            min(t+0.5, 2.5-t)), 
                        0., 1.);
        } 
        void main() {
            gl_FragColor.rgb= heatColorMap(v_value/u_maxvalue);// heatColorMap((v_position-11.358)/(30.-11.358));// = vec4(v_value/u_maxvalue,0,0,1.);
        }
        `,
        uniforms: {
            "u_screen": null,
            "u_maxvalue": 0.,
        }
    });
    // ScreenMaterial.side = t3d.DRAW_SIDE.BACK;
    ScreenMaterial.depthWrite = false;
    ScreenMaterial.depthTest = false;
    const waterMesh = new t3d.Mesh(topGeometry, ScreenMaterial);
    waterMesh.position.set(-4000,-30000,20000);
    //waterMesh.position.set( 0,45000,4000);
    scene.add(waterMesh);
    window.waterMesh = waterMesh;
}
function updateMesh(){

}
export {visData}