import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface RoomProps {
  width: number;
  height: number;
  name: string;
  scene: THREE.Scene;
}

export default function Room(props: RoomProps) {
  const { width, height, name, scene } = props;
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialsRef = useRef<THREE.MeshBasicMaterial[]>([]);

  useEffect(() => {
    // 如果已经存在网格，先清理
    if (meshRef.current) {
      scene.remove(meshRef.current);
      // 清理几何体和材质
      meshRef.current.geometry.dispose();
      materialsRef.current.forEach(material => {
        material.map?.dispose();
        material.dispose();
      });
    }

    const arr = [
      `./images/${name}/${name}_r.jpg`,
      `./images/${name}/${name}_l.jpg`,
      `./images/${name}/${name}_u.jpg`,
      `./images/${name}/${name}_b.jpg`,
      `./images/${name}/${name}_f.jpg`,
      `./images/${name}/${name}_d.jpg`
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

    materialsRef.current = materials;

    // 创建几何体
    const geometry = new THREE.BoxGeometry(width, height, 10);
    // 创建网格
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.geometry.scale(1, 1, -1); // 翻转Z轴
    scene.add(mesh);
    meshRef.current = mesh;

    // 清理函数
    return () => {
      if (meshRef.current) {
        scene.remove(meshRef.current);
        meshRef.current.geometry.dispose();
        materialsRef.current.forEach(material => {
          material.map?.dispose();
          material.dispose();
        });
        meshRef.current = null;
      }
    };
  }, [width, height, name, scene]); // 当这些值变化时重新创建

  return null;
}