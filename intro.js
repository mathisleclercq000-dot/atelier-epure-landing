/* =====================================================
   ATELIER ÉPURE — Hero d'intro : fond WebGL « nébuleuse »
   Port vanilla (zéro dépendance) du shader de
   Matthias Hurrle (@atzedent). Code possédé.

   Le fragment shader n'utilise que les uniformes `resolution`
   et `time` : pas d'interaction souris à gérer, donc pas de
   PointerHandler. Plus simple, même rendu.
   ===================================================== */
(function () {
  "use strict";

  var canvas = document.getElementById("intro-canvas");
  if (!canvas) return;

  var section = canvas.closest(".intro") || canvas.parentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gl = canvas.getContext("webgl2", { antialias: false, alpha: false });

  // Pas de WebGL2 → on bascule sur la nébuleuse CSS statique, le texte reste lisible.
  if (!gl) {
    section.classList.add("intro--nogl");
    return;
  }

  var vertexSrc =
    "#version 300 es\n" +
    "precision highp float;\n" +
    "in vec4 position;\n" +
    "void main(){gl_Position=position;}";

  var fragmentSrc =
    "#version 300 es\n" +
    "precision highp float;\n" +
    "out vec4 O;\n" +
    "uniform vec2 resolution;\n" +
    "uniform float time;\n" +
    "#define FC gl_FragCoord.xy\n" +
    "#define T time\n" +
    "#define R resolution\n" +
    "#define MN min(R.x,R.y)\n" +
    "float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}\n" +
    "float noise(in vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);float a=rnd(i),b=rnd(i+vec2(1,0)),c=rnd(i+vec2(0,1)),d=rnd(i+1.);return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}\n" +
    "float fbm(vec2 p){float t=.0,a=1.;mat2 m=mat2(1.,-.5,.2,1.2);for(int i=0;i<5;i++){t+=a*noise(p);p*=2.*m;a*=.5;}return t;}\n" +
    "float clouds(vec2 p){float d=1.,t=.0;for(float i=.0;i<3.;i++){float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);t=mix(t,d,a);d=a;p*=2./(i+1.);}return t;}\n" +
    "void main(void){\n" +
    "  vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);\n" +
    "  vec3 col=vec3(0);\n" +
    "  float bg=clouds(vec2(st.x+T*.5,-st.y));\n" +
    "  uv*=1.-.3*(sin(T*.2)*.5+.5);\n" +
    "  for(float i=1.;i<12.;i++){\n" +
    "    uv+=.1*cos(i*vec2(.1+.01*i,.8)+i*i+T*.5+.1*uv.x);\n" +
    "    vec2 p=uv;\n" +
    "    float d=length(p);\n" +
    "    col+=.00125/d*(cos(sin(i)*vec3(1,2,3))+1.);\n" +
    "    float b=noise(i+p+bg*1.731);\n" +
    "    col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));\n" +
    "    col=mix(col,vec3(bg*.25,bg*.137,bg*.05),d);\n" +
    "  }\n" +
    "  O=vec4(col,1);\n" +
    "}";

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("Atelier Épure — shader:", gl.getShaderInfoLog(s));
    }
    return s;
  }

  var program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSrc));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSrc));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Atelier Épure — program:", gl.getProgramInfoLog(program));
    section.classList.add("intro--nogl");
    return;
  }

  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]),
    gl.STATIC_DRAW
  );
  var position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(program, "resolution");
  var uTime = gl.getUniformLocation(program, "time");

  function resize() {
    // Demi-DPR : assez net, et deux fois moins de pixels à calculer.
    var dpr = Math.max(1, 0.5 * (window.devicePixelRatio || 1));
    var w = section.clientWidth || window.innerWidth;
    var h = section.clientHeight || window.innerHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener("resize", resize);

  function render(now) {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, now * 1e-3);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // Mouvement réduit → une seule image figée, pas de boucle.
  if (reduce) {
    render(2600);
    return;
  }

  var rafId = null;
  var running = false;
  function loop(now) {
    render(now);
    rafId = requestAnimationFrame(loop);
  }
  function start() {
    if (!running) {
      running = true;
      rafId = requestAnimationFrame(loop);
    }
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // On ne peint que quand l'intro est à l'écran (économie batterie/CPU).
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) start();
          else stop();
        });
      },
      { threshold: 0 }
    );
    io.observe(section);
  } else {
    start();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      stop();
    } else {
      var r = section.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) start();
    }
  });
})();
