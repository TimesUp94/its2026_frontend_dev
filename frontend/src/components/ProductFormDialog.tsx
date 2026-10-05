import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
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

type FormField = keyof typeof EMPTY_FORM;
type FieldErrors = Partial<Record<FormField, string>>;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function validateForm(form: typeof EMPTY_FORM): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim()) errors.name = "Il nome è obbligatorio.";
  else if (form.name.trim().length > 32) errors.name = "Il nome non può superare 32 caratteri.";
  if (!form.categoryId) errors.categoryId = "Seleziona una categoria.";
  if (form.brand.trim().length > 50) errors.brand = "La marca non può superare 50 caratteri.";
  if (form.description.trim().length > 500) errors.description = "La descrizione non può superare 500 caratteri.";
  if (form.price.trim() === "") errors.price = "Il prezzo è obbligatorio.";
  else if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
    errors.price = "Inserisci un prezzo valido maggiore o uguale a 0.";
  }
  if (form.stock.trim() !== "" && (!/^\d+$/.test(form.stock) || !Number.isSafeInteger(Number(form.stock)))) {
    errors.stock = "La disponibilità deve essere un numero intero maggiore o uguale a 0.";
  }
  return errors;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: ProductFormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<FormField, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [imageError, setImageError] = useState("");

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
      setTouched({});
      setImageError("");
    }
  }, [open, product]);

  const fieldErrors = validateForm(form);
  const visibleError = (field: FormField) => touched[field] ? fieldErrors[field] : undefined;
  const markTouched = (field: FormField) => setTouched((current) => ({ ...current, [field]: true }));
  const setField = (field: FormField) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    markTouched(field);
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    markTouched("imageUrl");
    if (!file.type.startsWith("image/")) {
      setImageError("Seleziona un file immagine valido.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("L’immagine deve pesare al massimo 5 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((current) => ({ ...current, imageUrl: reader.result as string }));
        setImageError("");
      }
    };
    reader.onerror = () => setImageError("Impossibile leggere il file selezionato.");
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched({
      name: true,
      description: true,
      categoryId: true,
      brand: true,
      price: true,
      stock: true,
      imageUrl: true,
    });
    if (Object.keys(fieldErrors).length > 0 || imageError) return;

    setSubmitting(true);
    const input: ProductInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      categoryId: Number(form.categoryId),
      brand: form.brand.trim(),
      price: Number(form.price),
      stock: form.stock === "" ? 0 : Number(form.stock),
      imageUrl: form.imageUrl || null,
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

  const errorText = (message?: string) => message ? <p className="text-sm text-destructive" role="alert">{message}</p> : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? "Modifica articolo" : "Nuovo articolo"}</DialogTitle>
          <DialogDescription>
            {product
              ? "Aggiorna le informazioni dell’articolo e salva."
              : "Compila i campi per aggiungere un articolo al catalogo."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="p-name">Nome *</Label>
            <Input id="p-name" value={form.name} maxLength={64} aria-invalid={!!visibleError("name")} aria-describedby={visibleError("name") ? "p-name-error" : undefined} onChange={setField("name")} />
            {visibleError("name") && <p id="p-name-error" className="text-sm text-destructive" role="alert">{visibleError("name")}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-category">Categoria *</Label>
              <Select value={form.categoryId} onValueChange={(value) => {
                setForm((current) => ({ ...current, categoryId: value }));
                markTouched("categoryId");
              }}>
                <SelectTrigger id="p-category" className="w-full" aria-invalid={!!visibleError("categoryId")}>
                  <SelectValue placeholder={loadingCategories ? "Caricamento..." : "Scegli una categoria"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errorText(visibleError("categoryId"))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-brand">Marca</Label>
              <Input id="p-brand" value={form.brand} aria-invalid={!!visibleError("brand")} onChange={setField("brand")} />
              {errorText(visibleError("brand"))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-description">Descrizione</Label>
            <Input id="p-description" value={form.description} aria-invalid={!!visibleError("description")} onChange={setField("description")} />
            {errorText(visibleError("description"))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-price">Prezzo (€) *</Label>
              <Input id="p-price" type="text" inputMode="decimal" value={form.price} aria-invalid={!!visibleError("price")} onChange={setField("price")} />
              {errorText(visibleError("price"))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-stock">Disponibilità</Label>
              <Input id="p-stock" type="number" min="0" step="1" value={form.stock} aria-invalid={!!visibleError("stock")} onChange={setField("stock")} />
              {errorText(visibleError("stock"))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-image">Immagine</Label>
            <input id="p-image" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
            <Button type="button" variant="outline" asChild>
              <label htmlFor="p-image" className="cursor-pointer">Scegli immagine</label>
            </Button>
            {form.imageUrl && <img src={form.imageUrl} alt="Anteprima immagine articolo" className="mt-2 h-28 w-28 rounded-md border object-cover" />}
            {errorText(imageError)}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Salvataggio..." : "Salva"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
