"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const [theme, setTheme] = React.useState("light")

  React.useEffect(() => {
    if (typeof document === "undefined" || !document.body) return
    const hasDarkClass = document.body.classList.contains("dark")
    const preferredTheme = hasDarkClass ? "dark" : "light"

    setTheme(preferredTheme)
    localStorage.setItem("theme", preferredTheme)
    document.cookie = `theme=${preferredTheme}; path=/; max-age=31536000; samesite=lax`
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000; samesite=lax`
    if (typeof document !== "undefined" && document.body) {
      document.body.classList.toggle("dark", newTheme === "dark")
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}