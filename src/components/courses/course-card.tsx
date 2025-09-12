import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Users, BookOpen, PlayCircle } from 'lucide-react'

interface CourseCardProps {
  course: {
    id: string
    title: string
    description: string
    thumbnail?: string | null
    instructor: string
    duration: string
    modules: number
    students: number
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    tags: string[]
    enrolled?: boolean
  }
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="aspect-video bg-muted relative">
        {course.thumbnail ? (
          <Image 
            src={course.thumbnail} 
            alt={course.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <PlayCircle className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {course.status === 'DRAFT' && (
          <Badge className="absolute top-2 right-2" variant="secondary">
            Draft
          </Badge>
        )}
      </div>

      <CardHeader>
        <CardTitle className="line-clamp-2">{course.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {course.description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap gap-1 mb-4">
          {course.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{course.instructor}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{course.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>{course.modules} modules</span>
            </div>
          </div>
          {course.students > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{course.students.toLocaleString()} students</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Link href={`/courses/${course.id}`} className="w-full">
          <Button className="w-full" variant={course.enrolled ? "secondary" : "default"}>
            {course.enrolled ? 'Continue Learning' : 'View Course'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}