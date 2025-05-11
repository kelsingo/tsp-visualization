"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [totalWeight, setTotalWeight] = useState<number | null>(null)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const tspVisualizer = new TSPVisualizer(canvas, setTotalWeight, setAnimating)

    // Generate initial random graph
    tspVisualizer.generateRandomGraph()

    // Set up event listeners
    const handleRandomClick = () => {
      tspVisualizer.generateRandomGraph()
      setTotalWeight(null)
    }

    const handleCanvasClick = (e: MouseEvent) => {
      if (animating) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      tspVisualizer.handleNodeClick(x, y)
    }

    // Add event listeners
    const randomButton = document.getElementById("randomButton")
    if (randomButton) {
      randomButton.addEventListener("click", handleRandomClick)
    }

    canvas.addEventListener("click", handleCanvasClick)

    // Clean up event listeners
    return () => {
      if (randomButton) {
        randomButton.removeEventListener("click", handleRandomClick)
      }
      canvas.removeEventListener("click", handleCanvasClick)
    }
  }, [animating])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">Traveling Salesman Problem Visualization</h1>

      <div className="flex flex-col items-center mb-6">
        <p className="text-gray-600 mb-4">
          Click the &quot;Random&quot; button to generate a random graph. Click on any node to start the animation from
          that node.
        </p>
        <Button id="randomButton" className="mb-4" disabled={animating}>
          Random
        </Button>

        {totalWeight !== null && (
          <Card className="p-4 bg-white shadow-md">
            <p className="text-lg font-medium">Total Path Weight: {totalWeight.toFixed(0)}</p>
          </Card>
        )}
      </div>

      <div className="border border-gray-300 rounded-lg overflow-hidden shadow-lg">
        <canvas ref={canvasRef} width={800} height={600} className="bg-white"></canvas>
      </div>
    </main>
  )
}

// TSP Visualizer class
class TSPVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private nodes: { x: number; y: number; id: number }[] = []
  private distanceMatrix: number[][] = []
  private animationFrameId: number | null = null
  private setTotalWeight: (weight: number | null) => void
  private setAnimating: (animating: boolean) => void

  constructor(
    canvas: HTMLCanvasElement,
    setTotalWeight: (weight: number | null) => void,
    setAnimating: (animating: boolean) => void,
  ) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")!
    this.setTotalWeight = setTotalWeight
    this.setAnimating = setAnimating
  }

  // Check if a new node position is valid (not too close to existing nodes)
  isValidNodePosition(x, y, minDistance) {
    for (const node of this.nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
          return false;
      }
    }
    return true;
  }
  

  // Generate a random graph with nodes and calculate distances
  generateRandomGraph() {
    // Cancel any ongoing animation
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }
    
    this.setAnimating(false);
    this.setTotalWeight(null);
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Generate random number of nodes (between 5 and 15)
    const numNodes = Math.floor(Math.random() * 7) + 3;
    this.nodes = [];
    
    // Minimum distance between nodes (approximately 1 cm)
    const minDistance = 38; // 1 cm ≈ 38 pixels
    
    // Generate random nodes
    const padding = 50;
    const maxAttempts = 100; // Prevent infinite loop
    
    for (let i = 0; i < numNodes; i++) {
      let validPosition = false;
      let attempts = 0;
      let x, y;
      
      // Try to find a valid position
      while (!validPosition && attempts < maxAttempts) {
        x = Math.random() * (this.canvas.width - 2 * padding) + padding;
        y = Math.random() * (this.canvas.height - 2 * padding) + padding;
        
        validPosition = this.isValidNodePosition(x, y, minDistance);
        attempts++;
      }
      
      // If we couldn't find a valid position after max attempts, reduce the number of nodes
      if (!validPosition) {
        console.log(`Could not place node ${i} after ${maxAttempts} attempts. Stopping at ${i} nodes.`);
        break;
      }
      
      this.nodes.push({
        x: x,
        y: y,
        id: i
      });
    }
    
    // Calculate distance matrix
    this.calculateDistanceMatrix();
    
    // Draw the graph
    this.drawGraph();
  }  

  // Calculate distances between all pairs of nodes
  calculateDistanceMatrix() {
    const n = this.nodes.length;
    this.distanceMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
    
    // Scale factor to keep distances below 100
    const scaleFactor = 0.2; // Adjust this value as needed
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
            const dx = this.nodes[i].x - this.nodes[j].x;
            const dy = this.nodes[i].y - this.nodes[j].y;
            // Calculate distance and scale it
            let distance = Math.sqrt(dx * dx + dy * dy) * scaleFactor;
            
            // Cap the distance at 99 if it's still too large
            distance = Math.min(distance, 99);
            
            this.distanceMatrix[i][j] = distance;
        } else {
            this.distanceMatrix[i][j] = Infinity; // Can't travel to self
        }
      }
    }
  }

  // Draw the graph with nodes and edges
  drawGraph() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw edges with weights
    this.ctx.strokeStyle = "rgba(150, 150, 150, 0.3)"
    this.ctx.lineWidth = 1
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
    this.ctx.font = "10px Arial"

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const node1 = this.nodes[i]
        const node2 = this.nodes[j]

        // Draw edge
        this.ctx.beginPath()
        this.ctx.moveTo(node1.x, node1.y)
        this.ctx.lineTo(node2.x, node2.y)
        this.ctx.stroke()

        // Draw weight
        const weight = Math.round(this.distanceMatrix[i][j]); // Round to integer
        const midX = (node1.x + node2.x) / 2;
        const midY = (node1.y + node2.y) / 2;

        this.ctx.fillText(weight.toString(), midX, midY);
      }
    }

    // Draw nodes
    for (const node of this.nodes) {
      this.ctx.fillStyle = "#3b82f6"
      this.ctx.beginPath()
      this.ctx.arc(node.x, node.y, 10, 0, Math.PI * 2)
      this.ctx.fill()

      // Draw node ID
      this.ctx.fillStyle = "white"
      this.ctx.font = "bold 10px Arial"
      this.ctx.textAlign = "center"
      this.ctx.textBaseline = "middle"
      this.ctx.fillText(node.id.toString(), node.x, node.y)
    }
  }

  // Handle node click event
  handleNodeClick(x: number, y: number) {
    // Find if a node was clicked
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i]
      const dx = x - node.x
      const dy = y - node.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance <= 10) {
        // Node radius is now 10
        this.startTSPAnimation(i)
        break
      }
    }
  }

  // Start TSP animation from the selected node
  startTSPAnimation(startNodeIndex: number) {
    // Cancel any ongoing animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }

    this.setAnimating(true)

    // Find the path using greedy algorithm
    const result = this.findMinRoute(startNodeIndex)

    // Animate the path
    let step = 0
    const animationSteps = result.steps

    const animateStep = () => {
      if (step < animationSteps.length) {
        this.drawAnimationStep(animationSteps, step)
        step++

        // Use setTimeout to slow down the animation (1000ms = 1 second between steps)
        setTimeout(() => {
          this.animationFrameId = requestAnimationFrame(animateStep)
        }, 1000)
      } else {
        // Animation complete
        this.setTotalWeight(result.totalCost)
        this.setAnimating(false)
      }
    }

    // Start animation
    animateStep()
  }

  // Draw a single animation step
  drawAnimationStep(steps: any[], currentStep: number) {
    // Redraw the graph
    this.drawGraph()

    const ctx = this.ctx

    // Draw the path so far
    const path = steps[currentStep].currentPath

    // Draw completed path segments
    ctx.strokeStyle = "#10b981" // Green
    ctx.lineWidth = 3

    for (let i = 0; i < path.length - 1; i++) {
      const node1 = this.nodes[path[i]]
      const node2 = this.nodes[path[i + 1]]

      ctx.beginPath()
      ctx.moveTo(node1.x, node1.y)
      ctx.lineTo(node2.x, node2.y)
      ctx.stroke()
    }

    // Highlight current edge being considered
    if (currentStep < steps.length) {
      const currentCity = steps[currentStep].currentCity
      const nextCity = steps[currentStep].nextCity
      const node1 = this.nodes[currentCity]
      const node2 = this.nodes[nextCity]

      ctx.strokeStyle = "#ef4444" // Red
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(node1.x, node1.y)
      ctx.lineTo(node2.x, node2.y)
      ctx.stroke()

      // Highlight current and next nodes
      ctx.fillStyle = "#ef4444" // Red
      ctx.beginPath()
      ctx.arc(node1.x, node1.y, 12, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "#f97316" // Orange
      ctx.beginPath()
      ctx.arc(node2.x, node2.y, 12, 0, Math.PI * 2)
      ctx.fill()

      // Redraw node labels for highlighted nodes
      ctx.fillStyle = "white"
      ctx.font = "bold 10px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(currentCity.toString(), node1.x, node1.y)
      ctx.fillText(nextCity.toString(), node2.x, node2.y)

      // // Show current step info
      // ctx.fillStyle = "black"
      // ctx.font = "14px Arial"
      // ctx.textAlign = "left"
      // ctx.fillText(`Step: ${currentStep + 1}/${steps.length}`, 10, 20)
      // ctx.fillText(`Current City: ${currentCity}`, 10, 40)
      // ctx.fillText(`Next City: ${nextCity}`, 10, 60)
      // ctx.fillText(`Edge Weight: ${steps[currentStep].costAdded.toFixed(2)}`, 10, 80)

      // Calculate cost so far
      let costSoFar = 0
      for (let i = 0; i <= currentStep; i++) {
        costSoFar += steps[i].costAdded
      }
      ctx.fillText(`Total Cost So Far: ${costSoFar.toFixed(2)}`, 10, 100)
    }
  }

  // Greedy algorithm to find the minimum route
  findMinRoute(startNodeIndex: number) {
    const n = this.nodes.length
    let totalCost = 0
    let currentCity = startNodeIndex
    const visitedCities = new Set([currentCity])
    const path = [currentCity]
    const steps = []

    // Visit all cities
    while (visitedCities.size < n) {
      let minDistance = Number.POSITIVE_INFINITY
      let nextCity = -1

      // Find the nearest unvisited city
      for (let j = 0; j < n; j++) {
        if (!visitedCities.has(j) && this.distanceMatrix[currentCity][j] < minDistance) {
          minDistance = this.distanceMatrix[currentCity][j]
          nextCity = j
        }
      }

      if (nextCity !== -1) {
        // Record this step
        steps.push({
          currentCity,
          nextCity,
          currentPath: [...path],
          costAdded: minDistance,
        })

        // Update variables
        totalCost += minDistance
        visitedCities.add(nextCity)
        path.push(nextCity)
        currentCity = nextCity
      }
    }

    // Return to starting city to complete the tour
    const returnCost = this.distanceMatrix[currentCity][startNodeIndex]
    steps.push({
      currentCity,
      nextCity: startNodeIndex,
      currentPath: [...path],
      costAdded: returnCost,
    })

    totalCost += returnCost
    path.push(startNodeIndex)

    return {
      totalCost,
      finalPath: path,
      steps,
    }
  }
}
