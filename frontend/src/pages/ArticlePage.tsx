import { ArrowLeft, LoaderCircle, Package, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  fetchProduct,
  formatPrice,
  getErrorMessage,
  type Product,
} from "@/lib/api";

// http://localhost:3001/api/products/:id GET
// http://localhost:3001/api/products?search=Cuffie&sort=name&order=asc
// protocol://domain/path:port?querystring#fragment
export function ArticlePage() {
  const { articleid } = useParams();
  const [article, setArticle] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  const productId = articleid ? Number(articleid) : null;

  useEffect(() => {
    let cancelled = false;
    setArticle(null);
    setImageFailed(false);
    setError("");
    setLoading(true);

    if (productId === null || !Number.isInteger(productId) || productId < 1) {
      setError("L’identificativo dell’articolo non è valido.");
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    fetchProduct(productId)
      .then((data) => {
        if (!cancelled) setArticle(data);
      })
      .catch((requestError) => {
        console.error("Product error: ", requestError);
        if (!cancelled) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [articleid, productId]);

  // let articleContent = null;
  // if (article) {
  //   articleContent = <div>Articolo: {article.name}</div>;
  // }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => {
          history.back();
        }}
      >
        {/* <Link to="/"> */}
        <ArrowLeft aria-hidden="true" />
        {/* Torna al catalogo */}
        {/* </Link> */}
      </Button>

      {loading ? (
        <div
          className="flex min-h-80 flex-col items-center justify-center gap-3 text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle
            className="size-8 animate-spin text-primary"
            aria-hidden="true"
          />
          <p>Caricamento articolo...</p>
        </div>
      ) : error ? (
        <Card className="mx-auto max-w-xl">
          <CardHeader className="items-center text-center">
            <div className="mb-2 rounded-full bg-destructive/10 p-3 text-destructive">
              <Package className="size-6" aria-hidden="true" />
            </div>
            <CardTitle>Articolo non disponibile</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link to="/">Sfoglia il catalogo</Link>
            </Button>
          </CardContent>
        </Card>
      ) : article ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <Tag aria-hidden="true" />
              {article.category}
            </Badge>
            {article.brand && (
              <span className="text-sm text-muted-foreground">
                {article.brand}
              </span>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Card className="min-h-80 overflow-hidden bg-muted/40 p-0 sm:min-h-[28rem]">
              {article.imageUrl && !imageFailed ? (
                <img
                  src={article.imageUrl}
                  alt={article.name}
                  className="h-full min-h-80 w-full object-contain p-6 sm:min-h-[28rem]"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-muted-foreground sm:min-h-[28rem]">
                  <Package className="size-16 stroke-1" aria-hidden="true" />
                  <span className="text-sm">Immagine non disponibile</span>
                </div>
              )}
            </Card>

            <Card className="justify-between">
              <CardHeader className="gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Dettaglio articolo
                  </p>
                  <CardTitle className="text-2xl leading-tight sm:text-3xl">
                    {article.name}
                  </CardTitle>
                </div>
                <p className="text-3xl font-bold tracking-tight">
                  {formatPrice(article.price)}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="mb-2 text-sm font-medium">Disponibilità</p>
                  {article.stock > 0 ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Disponibile</Badge>
                      <span className="text-sm text-muted-foreground">
                        {article.stock}{" "}
                        {article.stock === 1 ? "pezzo" : "pezzi"} in magazzino
                      </span>
                    </div>
                  ) : (
                    <Badge variant="destructive">Al momento esaurito</Badge>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Categoria</dt>
                    <dd className="font-medium">{article.category}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Marca</dt>
                    <dd className="font-medium">
                      {article.brand || "Non specificata"}
                    </dd>
                  </div>
                </dl>

                <section
                  className="space-y-2 border-t pt-5"
                  aria-labelledby="description-heading"
                >
                  <h2 id="description-heading" className="font-semibold">
                    Descrizione
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {article.description ||
                      "Nessuna descrizione disponibile per questo articolo."}
                  </p>
                </section>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {/* {article ? <div>Articolo: {article.name}</div> : null} */}
      {/* {articleContent} */}
    </main>
  );
}
