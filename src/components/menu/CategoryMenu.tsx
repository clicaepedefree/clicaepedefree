import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  display_order: number;
}

interface CategoryMenuProps {
  categories: Category[];
}

export function CategoryMenu({ categories }: CategoryMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("");

  useEffect(() => {
    const handleScroll = () => {
      // Show menu after scrolling 200px
      setIsVisible(window.scrollY > 200);

      // Detect which category is in view
      const categoryElements = categories.map(cat => 
        document.getElementById(`category-${cat.id}`)
      );

      for (const element of categoryElements) {
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveCategory(element.id.replace('category-', ''));
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories]);

  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      const offsetTop = element.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth"
      });
    }
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border shadow-md z-40 transition-transform duration-300",
        isVisible ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => scrollToCategory(category.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                activeCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
