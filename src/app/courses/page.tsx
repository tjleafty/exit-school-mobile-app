'use client'

import { useState, useEffect } from 'react'
import { CourseCard } from '@/components/courses/course-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Loader2, X } from 'lucide-react'
import type { CourseWithDetails } from '@/lib/db/courses'

interface FilterData {
  tags: string[]
  instructors: Array<{ id: string; name: string; courseCount: number }>
  categories: string[]
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithDetails[]>([])
  const [filterData, setFilterData] = useState<FilterData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  
  useEffect(() => {
    fetchInitialData()
  }, [])
  
  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      fetchCourses()
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchTerm, selectedTags])
  
  const fetchInitialData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [coursesResponse, filtersResponse] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/courses/filters')
      ])
      
      if (!coursesResponse.ok || !filtersResponse.ok) {
        throw new Error('Failed to fetch data')
      }
      
      const [coursesData, filtersData] = await Promise.all([
        coursesResponse.json(),
        filtersResponse.json()
      ])
      
      setCourses(coursesData.courses)
      setFilterData(filtersData)
      
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load courses')
    } finally {
      setIsLoading(false)
    }
  }
  
  const fetchCourses = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','))
      
      const response = await fetch(`/api/courses?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch courses')
      }
      
      const data = await response.json()
      setCourses(data.courses)
      
    } catch (err) {
      console.error('Search error:', err)
      // Don't show error for search failures, just keep existing courses
    }
  }
  
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }
  
  const clearFilters = () => {
    setSearchTerm('')
    setSelectedTags([])
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading courses...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={fetchInitialData}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Course Catalog</h1>
        <p className="text-muted-foreground mt-2">
          Explore our comprehensive curriculum on business acquisitions
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {selectedTags.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedTags.length}
                </Badge>
              )}
            </Button>
            {(searchTerm || selectedTags.length > 0) && (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
        
        {/* Active Filters */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tag => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        )}
        
        {/* Filter Panel */}
        {showFilters && filterData && (
          <div className="border rounded-lg p-4 space-y-4">
            <div>
              <h4 className="font-medium mb-2">Categories</h4>
              <div className="flex flex-wrap gap-2">
                {filterData.categories.map(category => (
                  <Badge
                    key={category}
                    variant={selectedTags.includes(category) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
            
            {filterData.tags.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {filterData.tags
                    .filter(tag => !filterData.categories.includes(tag))
                    .map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {courses.length === 0 ? 'No courses found' : 
           `${courses.length} course${courses.length === 1 ? '' : 's'} found`}
        </p>
        
        {courses.length > 0 && searchTerm && (
          <p className="text-sm text-muted-foreground">
            Results for "{searchTerm}"
          </p>
        )}
      </div>
      
      {/* Course Grid */}
      {courses.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No courses found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedTags.length > 0 
              ? 'Try adjusting your search or filters'
              : 'No courses are currently available'}
          </p>
          {(searchTerm || selectedTags.length > 0) && (
            <Button onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  )
}