import React, { useState } from 'react';
import { Package, Info, Settings, User, LogOut, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const UITest: React.FC = () => {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">UI Component Test</h1>
          <p className="text-slate-600">Testing shadcn/ui components with Tailwind CSS</p>
          <Badge variant="secondary">Development Mode</Badge>
        </div>

        <Separator />

        {/* Buttons Section */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Various button styles and sizes</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">
              <Package className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Badges Section */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Status and label badges</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </CardContent>
        </Card>

        {/* Input & Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>Input & Labels</CardTitle>
            <CardDescription>Form input components</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
          </CardContent>
        </Card>

        {/* Dialog, Dropdown, Sheet Section */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Components</CardTitle>
            <CardDescription>Dialogs, dropdowns, and sheets</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {/* Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Info className="mr-2 h-4 w-4" />
                  Open Dialog
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you sure?</DialogTitle>
                  <DialogDescription>
                    This is a sample dialog component. It can be used for confirmations,
                    forms, or displaying important information.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Dropdown Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="mr-2 h-4 w-4" />
                  Messages
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Package className="mr-2 h-4 w-4" />
                  Open Sheet
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Edit Profile</SheetTitle>
                  <SheetDescription>
                    Make changes to your profile here. Click save when you're done.
                  </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" placeholder="@johndoe" />
                  </div>
                </div>
                <SheetFooter>
                  <SheetClose asChild>
                    <Button type="submit">Save changes</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>

        {/* Icons Section */}
        <Card>
          <CardHeader>
            <CardTitle>Lucide Icons</CardTitle>
            <CardDescription>Icon samples from lucide-react</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Package className="h-6 w-6 text-slate-600" />
            <Info className="h-6 w-6 text-blue-600" />
            <Settings className="h-6 w-6 text-slate-600" />
            <User className="h-6 w-6 text-slate-600" />
            <Mail className="h-6 w-6 text-slate-600" />
            <LogOut className="h-6 w-6 text-red-600" />
          </CardContent>
        </Card>

        {/* Multiple Cards Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Card 1</CardTitle>
              <CardDescription>First card example</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                This demonstrates a grid layout with multiple cards.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="outline" className="w-full">View More</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Card 2</CardTitle>
              <CardDescription>Second card example</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Responsive grid adapts to screen size automatically.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="outline" className="w-full">View More</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Card 3</CardTitle>
              <CardDescription>Third card example</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Clean, modern design system foundation.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="outline" className="w-full">View More</Button>
            </CardFooter>
          </Card>
        </div>

        <Separator />

        <div className="text-center text-sm text-slate-500">
          <p>✓ All components working correctly</p>
          <p>✓ Tailwind CSS configured</p>
          <p>✓ shadcn/ui installed</p>
        </div>
      </div>
    </div>
  );
};

export default UITest;
