import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

const ROOM_POSITION: Record<string, { x: number, y: number, z: number }> = {
  masterBedroom: {
    x: 0,
    y: 0,
    z: 10
  },
  livingRoom: {
    x: 0,
    y: 0,
    z: 0.01,
  },
  tatamiRoom: { x: -10, y: 0, z: 10 },
  secondaryBedroom: { x: -20, y: 0, z: 10 },
  bathroom: { x: -10, y: 0, z: 0 }
} as const;

// 房间边界定义（每个房间是 10x10 的盒子）
const ROOM_BOUNDS: Record<string, { minX: number, maxX: number, minZ: number, maxZ: number }> = {
  livingRoom: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
  masterBedroom: { minX: -5, maxX: 5, minZ: 5, maxZ: 15 },
  tatamiRoom: { minX: -15, maxX: -5, minZ: 5, maxZ: 15 },
  secondaryBedroom: { minX: -25, maxX: -15, minZ: 5, maxZ: 15 },
  bathroom: { minX: -15, maxX: -5, minZ: -5, maxZ: 5 }
};

// 判断相机当前在哪个房间
function getCurrentRoom(cameraPos: { x: number, y: number, z: number }): string | null {
  for (const [roomName, bounds] of Object.entries(ROOM_BOUNDS)) {
    if (
      cameraPos.x >= bounds.minX &&
      cameraPos.x <= bounds.maxX &&
      cameraPos.z >= bounds.minZ &&
      cameraPos.z <= bounds.maxZ
    ) {
      return roomName;
    }
  }
  return null;
}

// 判断 hotspot 属于哪个房间
function getHotspotRoom(hotspotPos: { x: number, y: number, z: number }): string | null {
  return getCurrentRoom(hotspotPos);
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipsRef = useRef<Map<THREE.Sprite, HTMLDivElement>>(new Map());
  // 初始化场景
  const scene = new THREE.Scene();

  // 创建相机
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  // 相机放入场景中
  camera.position.set(0, 0, 0.01);

  // 创建渲染器
  const renderer = new THREE.WebGLRenderer();
  // 设置渲染器大小
  renderer.setSize(window.innerWidth, window.innerHeight);
  // 创建客厅
  const livingRoom = createRoom({ name: 'livingRoom' });
  scene.add(livingRoom);
  // 创建主卧
  const masterBedroom = createRoom({ name: 'masterBedroom', x: 0, y: 0, z: 10 });
  masterBedroom.rotation.y = Math.PI;
  scene.add(masterBedroom);
  // 创建榻榻米房
  const tatamiRoom = createRoom({ name: 'tatamiRoom', x: -10, y: 0, z: 10 });
  tatamiRoom.rotation.y = Math.PI;
  scene.add(tatamiRoom);
  // 创建次卧
  const secondaryBedroom = createRoom({ name: 'secondaryBedroom', x: -20, y: 0, z: 10 });
  secondaryBedroom.rotation.y = Math.PI / 2;
  scene.add(secondaryBedroom);
  // 创建卫生间
  const bathroom = createRoom({ name: 'bathroom', x: -10, y: 0, z: 0 });
  bathroom.rotation.y = Math.PI / 2;
  scene.add(bathroom);
  
  const poiObjects: THREE.Sprite[] = [];
  // 客厅到主卧的导航
  const masterBedroomPoint = createHotspot({ name: '主卧', target: 'masterBedroom', x: 1.2, y: 0.5, z: 4 });
  masterBedroomPoint && scene.add(masterBedroomPoint) && poiObjects.push(masterBedroomPoint);
  // 主卧到客厅的导航
  const masterBedroomBackPoint = createHotspot({ name: '客餐厅', target: 'livingRoom', x: -3, y: 0.25, z: 9.65 });
  masterBedroomBackPoint && scene.add(masterBedroomBackPoint) && poiObjects.push(masterBedroomBackPoint);
  // 客厅到榻榻米房的导航
  const tatamiRoomPoint = createHotspot({ name: '榻榻米房', target: 'tatamiRoom', x: -1.7, y: 0.5, z: 4 });
  tatamiRoomPoint && scene.add(tatamiRoomPoint) && poiObjects.push(tatamiRoomPoint);
  // 榻榻米房到客厅的导航
  const tatamiRoomBackPoint = createHotspot({ name: '客餐厅', target: 'livingRoom', x: -9.5, y: 0.25, z: 6 });
  tatamiRoomBackPoint && scene.add(tatamiRoomBackPoint) && poiObjects.push(tatamiRoomBackPoint);
  // 客厅到次卧的导航
  const secondaryBedroomPoint = createHotspot({ name: '次卧', target: 'secondaryBedroom', x: -3.2, y: 0.5, z: 4 });
  secondaryBedroomPoint && scene.add(secondaryBedroomPoint) && poiObjects.push(secondaryBedroomPoint);
  // 次卧到客厅的导航
  const secondaryBedroomBackPoint = createHotspot({ name: '客餐厅', target: 'livingRoom', x: -19.6, y: 0.25, z: 6 });
  secondaryBedroomBackPoint && scene.add(secondaryBedroomBackPoint) && poiObjects.push(secondaryBedroomBackPoint);
  // 客厅到卫生间的导航
  const bathroomPoint = createHotspot({ name: '卫生间', target: 'bathroom', x: -3.5, y: -0.8, z: 3.4 });
  bathroomPoint && scene.add(bathroomPoint) && poiObjects.push(bathroomPoint);
  // 卫生间到客厅的导航
  const bathroomBackPoint = createHotspot({ name: '客餐厅', target: 'livingRoom', x: -10, y: 0.25, z: 3.4 });
  bathroomBackPoint && scene.add(bathroomBackPoint) && poiObjects.push(bathroomBackPoint);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  
  useEffect(() => {
    if (!containerRef.current) return;

    // 添加到容器
    containerRef.current.appendChild(renderer.domElement);

    // 为每个 hotspot 创建提示框（始终显示）
    const createTooltip = (sprite: THREE.Sprite, name: string) => {
      const tooltip = document.createElement('div');
      tooltip.className = 'hotspot-tooltip';
      tooltip.textContent = name;
      tooltip.style.display = 'block'; // 始终显示
      containerRef.current?.appendChild(tooltip);
      tooltipsRef.current.set(sprite, tooltip);
      return tooltip;
    };

    poiObjects.forEach(sprite => {
      createTooltip(sprite, sprite.userData.name);
    });

    // 创建渲染循环
    const render = () => {
      // 获取当前相机所在的房间
      const currentRoom = getCurrentRoom({
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      });
      // 更新所有 hotspot 的大小以保持固定像素大小
      poiObjects.forEach(sprite => {
        if (sprite.userData.pixelSize) {
          const distance = camera.position.distanceTo(sprite.position);
          const fov = camera.fov * (Math.PI / 180); // FOV 转换为弧度
          const height = window.innerHeight;
          
          // 计算保持固定像素大小所需的 scale
          // 公式：scale = (像素大小 / 屏幕高度) * 2 * 距离 * tan(fov/2)
          const scale = (sprite.userData.pixelSize / height) * 2 * distance * Math.tan(fov / 2);
          sprite.scale.set(scale, scale, scale);
        }

        // 判断这个 hotspot 属于哪个房间
        const hotspotRoom = getHotspotRoom({
          x: sprite.position.x,
          y: sprite.position.y,
          z: sprite.position.z
        });

        // 将 3D 位置转换为屏幕坐标
        const vector = sprite.position.clone();
        vector.project(camera);
        
        const tooltip = tooltipsRef.current.get(sprite);
        if (tooltip) {
          // 只显示当前房间内的 hotspot 提示框
          const isInCurrentRoom = hotspotRoom === currentRoom;

          const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
          const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
          
          // 如果 hotspot 在屏幕内且属于当前房间，显示提示框
          if (isInCurrentRoom && vector.z < 1 && Math.abs(vector.x) < 1.2 && Math.abs(vector.y) < 1.2) {
            tooltip.style.display = 'block';
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y - 60}px`; // 在图标上方 50px
            tooltip.style.transform = 'translateX(-50%)'; // 居中
          } else {
            // 不在当前房间或屏幕外时隐藏
            tooltip.style.display = 'none';
          }
        }
      });
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };  
    render();

    let isMouseDown = false

    containerRef.current.addEventListener('mousedown', () => {
      isMouseDown = true;
    });
    containerRef.current.addEventListener('mouseup', () => {
      isMouseDown = false;
    });
    containerRef.current.addEventListener('mouseout', () => {
      isMouseDown = false;
    });
    containerRef.current.addEventListener("mousemove", (event) => {
      if (isMouseDown) {
        // 限制上下角度范围（-90度到90度，约-1.57到1.57弧度）
        const maxPitch = Math.PI / 2; // 90度
        camera.rotation.x += event.movementY * 0.001;
        camera.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, camera.rotation.x));
        camera.rotation.y += event.movementX * 0.001;
        camera.rotation.z = 0;
        camera.rotation.order = "YXZ";
      }
    });

    window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    });

    window.addEventListener('click', (event: MouseEvent) => {
      event.preventDefault();
      // 将鼠标位置归一化为设备坐标。x 和 y 方向的取值范围是 (-1 to +1)
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // 通过摄像机和鼠标位置更新射线
      raycaster.setFromCamera(pointer, camera);
      // 计算物体和射线的交点
      const intersects = raycaster.intersectObjects(poiObjects);
      if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        const pointName = clickedObject.name;
        console.log(pointName);
        gsap.to(camera.position, {
          duration: 1,
          ...ROOM_POSITION[pointName]
        });
      }
    });

    // 清理函数
    return () => {
      tooltipsRef.current.forEach(tooltip => {
        tooltip.remove();
      });
      tooltipsRef.current.clear();
    };
  }, [])

  // 创建渲染循环
  return <div className="container" ref={containerRef}></div>;
}

function createRoom({ name, x = 0, y = 0, z = 0 }: { name: string, x?: number, y?: number, z?: number }) {
  // 右 左 上 下 前 后
  const arr = [
    `./images/${name}/${name}_r.jpg`,
    `./images/${name}/${name}_l.jpg`,
    `./images/${name}/${name}_u.jpg`,
    `./images/${name}/${name}_d.jpg`,
    `./images/${name}/${name}_f.jpg`,
    `./images/${name}/${name}_b.jpg`
  ];

  // 创建材质（纹理加载是异步的，但会在加载完成后自动更新）
  const materials: THREE.MeshBasicMaterial[] = arr.map(item => {
    const texture = new THREE.TextureLoader().load(
      item,
      // 加载成功回调（可选）
      undefined,
      // 加载进度回调（可选）
      undefined,
      // 加载错误回调
      (error) => {
        console.error(`Failed to load texture: ${item}`, error);
      }
    );
    return new THREE.MeshBasicMaterial({ map: texture });
  });

  // 创建几何体
  const geometry = new THREE.BoxGeometry(10, 10, 10);
  // 创建网格
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.geometry.scale(1, 1, -1); // 翻转Z轴
  const position = new THREE.Vector3(x, y, z);
  mesh.position.copy(position);

  return mesh;
}

function createHotspot({ name, target, x, y, z, pixelSize = 32 }: { name: string, target: string, x: number, y: number, z: number, pixelSize?: number }) {
  const texture = new THREE.TextureLoader().load('./images/hotspot.svg');
  // 创建导航
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMaterial);
  const spritePosition = new THREE.Vector3(x, y, z);
  sprite.position.copy(spritePosition);
  sprite.name = target;
  
  // 存储固定的像素大小，渲染循环中会根据距离动态调整 scale
  sprite.userData.pixelSize = pixelSize;
  sprite.userData.name = name;
  
  return sprite;
}