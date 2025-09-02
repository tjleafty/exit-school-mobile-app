import { Button } from '@/components/ui/button'
import { ArrowRight, BookOpen, Users, Award, PlayCircle } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Master Business Acquisitions
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Learn from industry experts and gain the skills needed to identify, evaluate, and acquire businesses successfully.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/courses">
            <Button size="lg">
              Browse Courses
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 grid md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Comprehensive Curriculum</h3>
          <p className="text-muted-foreground">
            From market research to deal closing, cover every aspect of business acquisitions.
          </p>
        </div>
        <div className="text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Expert Instructors</h3>
          <p className="text-muted-foreground">
            Learn from successful entrepreneurs and M&A professionals with real-world experience.
          </p>
        </div>
        <div className="text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Practical Tools</h3>
          <p className="text-muted-foreground">
            Access templates, checklists, and resources you can use in your acquisition journey.
          </p>
        </div>
      </section>

      {/* Featured Course Section */}
      <section className="py-16 bg-muted/50 rounded-lg p-8">
        <h2 className="text-3xl font-bold mb-8 text-center">Featured Course</h2>
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <h3 className="text-2xl font-semibold mb-4">Business Acquisitions 101</h3>
            <p className="text-muted-foreground mb-4">
              Start your journey into business acquisitions with this comprehensive introductory course. 
              Learn the fundamentals of finding, evaluating, and acquiring profitable businesses.
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center">
                <PlayCircle className="h-4 w-4 mr-2 text-primary" />
                12 video lessons
              </li>
              <li className="flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-primary" />
                Downloadable resources
              </li>
              <li className="flex items-center">
                <Award className="h-4 w-4 mr-2 text-primary" />
                Certificate of completion
              </li>
            </ul>
            <Link href="/courses/business-acquisitions-101">
              <Button>
                Learn More
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="flex-1">
            <div className="bg-muted rounded-lg aspect-video flex items-center justify-center">
              <PlayCircle className="h-16 w-16 text-muted-foreground" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}