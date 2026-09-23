import {
  Layers,
  Copy,
} from 'lucide-react';
// Shadcn Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';
import { Badge } from '@rentify/shared/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@rentify/shared/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@rentify/shared/ui/table';

export const ProductVariantsManager = ({
  variants,
  options,
  onVariantChange,
  onGenerateVariants,
  errors,
}) => {
  if (options.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Product Variants</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create variations based on product options
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 text-center py-12">
          <div className="p-4 rounded-full bg-muted/30 inline-flex mb-4">
            <Layers className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            No variants available
          </h3>
          <p className="text-muted-foreground mb-6">
            Add product options first to generate variants
          </p>
          <Button disabled variant="outline">
            Generate Variants
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Product Variants</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage pricing, inventory, and details for each variant
              </p>
            </div>
          </CardTitle>
          <Button onClick={onGenerateVariants} size="sm" className="gap-2">
            <Copy className="h-4 w-4" />
            Generate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {variants.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-muted rounded-xl">
            <div className="p-4 rounded-full bg-muted/30 inline-flex mb-4">
              <Layers className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No variants generated
            </h3>
            <p className="text-muted-foreground mb-6">
              Click "Generate Variants" to create variants based on your options
            </p>
            <Button onClick={onGenerateVariants} className="gap-2">
              <Copy className="h-4 w-4" />
              Generate Variants
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {options.map((option, index) => (
                    <TableHead key={index} className="font-medium">{option.name}</TableHead>
                  ))}
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant, variantIndex) => (
                  <TableRow key={variantIndex} className="hover:bg-muted/30">
                    {options.map((option, optionIndex) => (
                      <TableCell key={optionIndex} className="font-medium">
                        {variant.optionValues[option.name]}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Input
                        value={variant.sku}
                        onChange={(e) =>
                          onVariantChange(variantIndex, 'sku', e.target.value)
                        }
                        placeholder="SKU"
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-muted-foreground text-sm">$</span>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          value={variant.price}
                          onChange={(e) =>
                            onVariantChange(
                              variantIndex,
                              'price',
                              parseFloat(e.target.value)
                            )
                          }
                          className="h-9 pl-7"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={variant.stockQuantity}
                        onChange={(e) =>
                          onVariantChange(
                            variantIndex,
                            'stockQuantity',
                            parseInt(e.target.value)
                          )
                        }
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={variant.status}
                        onValueChange={(value) =>
                          onVariantChange(variantIndex, 'status', value)
                        }
                      >
                        <SelectTrigger className="h-9 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active" className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-success" />
                            Active
                          </SelectItem>
                          <SelectItem value="disabled" className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-muted" />
                            Disabled
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {errors && typeof errors === 'string' && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{errors}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};