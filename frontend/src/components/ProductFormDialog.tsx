import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProduct,
  fetchCategories,
  getErrorMessage,
  updateProduct,
  type Category,
  type Product,
  type ProductInput,
} from "@/lib/api";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prodotto da modificare; null per crearne uno nuovo */
  product: Product | null;
  onSaved: () => void;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  categoryId: "",
  brand: "",
  price: "",
  stock: "",
  imageUrl: "",
};

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: ProductFormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Le categorie vengono richieste a ogni apertura del dialog, cosi' l'elenco
  // riflette sempre quelle presenti sul server (GET /api/categories).
  useEffect(() => {
    if (!open) return;
    setLoadingCategories(true);
    fetchCategories()
      .then(setCategories)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingCategories(false));
  }, [open]);

  useEffect(() => {
    if (open) {
      setForm(
        product
          ? {
              name: product.name,
              description: product.description,
              categoryId: String(product.categoryId),
              brand: product.brand,
              price: String(product.price),
              stock: String(product.stock),
              imageUrl: product.imageUrl ?? "",
            }
          : EMPTY_FORM,
      );
    }
  }, [open, product]);

  const setField =
    (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.categoryId === "") {
      toast.error("Seleziona una categoria");
      return;
    }
    setSubmitting(true);
    const input: ProductInput = {
      name: form.name,
      description: form.description,
      categoryId: Number(form.categoryId),
      brand: form.brand,
      price: Number(form.price),
      stock: form.stock === "" ? 0 : Number(form.stock),
      imageUrl: form.imageUrl.trim() === "" ? null : form.imageUrl.trim(),
    };
    try {
      if (product) {
        await updateProduct(product.id, input);
        toast.success("Articolo aggiornato");
      } else {
        await createProduct(input);
        toast.success("Articolo creato");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  console.log('Valori form attuali:', form)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {product ? "Modifica articolo" : "Nuovo articolo"}
          </DialogTitle>
          <DialogDescription>
            {product
              ? "Aggiorna le informazioni dell’articolo e salva."
              : "Compila i campi per aggiungere un articolo al catalogo."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="p-name">Nome *</Label>
            <Input
              id="p-name"
              required
              value={form.name}
              onChange={setField("name")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-category">Categoria *</Label>
              <Select
                value={form.categoryId}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, categoryId: value }))
                }
              >
                <SelectTrigger id="p-category" className="w-full">
                  <SelectValue
                    placeholder={
                      loadingCategories
                        ? "Caricamento..."
                        : "Scegli una categoria"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-brand">Marca</Label>
              <Input
                id="p-brand"
                value={form.brand}
                onChange={setField("brand")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-description">Descrizione</Label>
            <Input
              id="p-description"
              value={form.description}
              onChange={setField("description")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-price">Prezzo (€) *</Label>
              <Input
                id="p-price"
                // type="number"
                type="text"
                inputMode="decimal"
                // min="0"
                // step="0.01"
                required
                value={form.price}
                onChange={(event) => {
                  console.log("event.target.value", event.target.value);
                  if (!isNaN(+event.target.value)) {
                    setForm({
                      ...form,
                      price: event.target.value,
                    });
                  }

                  // setForm({
                  //   brand: form.brand,
                  //   category: form.category,
                  //   description: form.description,
                  //   imageUrl: form.imageUrl,
                  //   name: form.name,
                  //   stock: form.stock,
                  //   price: event.target.value
                  // })
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-stock">Disponibilità</Label>
              <Input
                id="p-stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={setField("stock")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-image">URL immagine</Label>
            <Input
              id="p-image"
              value={form.imageUrl}
              onChange={setField("imageUrl")}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
