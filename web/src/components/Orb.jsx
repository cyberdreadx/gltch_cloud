import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import './Orb.css'

export default function Orb({ state = 'idle' }) {
    const containerRef = useRef(null)
    const sceneRef = useRef(null)

    useEffect(() => {
        if (!containerRef.current || sceneRef.current) return

        const container = containerRef.current
        const width = container.clientWidth
        const height = container.clientHeight

        // Scene setup
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
        renderer.setSize(width, height)
        renderer.setPixelRatio(window.devicePixelRatio)
        container.appendChild(renderer.domElement)

        // Create orb
        const geometry = new THREE.SphereGeometry(1.5, 64, 64)
        const material = new THREE.MeshStandardMaterial({
            color: 0xa855f7,
            emissive: 0x6b21a8,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2,
        })
        const orb = new THREE.Mesh(geometry, material)
        scene.add(orb)

        // Lighting
        const light = new THREE.PointLight(0xa855f7, 2, 100)
        light.position.set(5, 5, 5)
        scene.add(light)

        const ambientLight = new THREE.AmbientLight(0x404040)
        scene.add(ambientLight)

        camera.position.z = 4

        // Animation
        let animationId
        const animate = () => {
            animationId = requestAnimationFrame(animate)

            orb.rotation.x += 0.003
            orb.rotation.y += 0.005

            // Pulse based on state
            const time = Date.now() * 0.001
            const baseScale = state === 'thinking' ? 1.1 : state === 'speaking' ? 1.15 : 1
            const pulseSpeed = state === 'thinking' ? 3 : state === 'speaking' ? 5 : 1.5
            const pulseAmount = state === 'thinking' ? 0.08 : state === 'speaking' ? 0.12 : 0.03

            const scale = baseScale + Math.sin(time * pulseSpeed) * pulseAmount
            orb.scale.set(scale, scale, scale)

            // Emissive intensity based on state
            material.emissiveIntensity = state === 'speaking' ? 0.8 : state === 'thinking' ? 0.6 : 0.4

            renderer.render(scene, camera)
        }
        animate()

        sceneRef.current = { scene, renderer, orb, material }

        return () => {
            cancelAnimationFrame(animationId)
            renderer.dispose()
            geometry.dispose()
            material.dispose()
            container.removeChild(renderer.domElement)
            sceneRef.current = null
        }
    }, [])

    // Update material when state changes
    useEffect(() => {
        if (sceneRef.current?.material) {
            const colors = {
                idle: 0xa855f7,
                thinking: 0x6366f1,
                speaking: 0xec4899
            }
            sceneRef.current.material.color.setHex(colors[state] || colors.idle)
        }
    }, [state])

    return (
        <div className="orb-container" ref={containerRef}>
            <div className={`orb-glow ${state}`}></div>
        </div>
    )
}
