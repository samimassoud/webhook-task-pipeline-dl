# Bootstrap

## Bootstrapping Bitnami Sealed Secrets

### 1. Install Sealed Secrets
```bash
helm upgrade --install sealed-secrets \
platform/charts/sealed-secrets \
-f platform/charts/environments/dev/values-sealed-secrets.yaml
```
Verify:
```bash
kubectl get pods -n kube-system
```

### 2. Install kubeseal
```bash
curl -OL "https://github.com/bitnami/sealed-secrets/releases/download/v0.38.4/kubeseal-0.38.4-linux-amd64.tar.gz"
tar -xvzf kubeseal-0.38.4-linux-amd64.tar.gz kubeseal
sudo install -m 755 kubeseal /usr/local/bin/kubeseal
```
Verify:
```bash
kubeseal --version
```
### 3. Export the controller certificate
```bash
 kubeseal \        
--controller-name sealed-secrets-controller \
--controller-namespace kube-system \
--fetch-cert > platform/secrets/sealed-secrets.crt
```
This is the public key certificate, and it's safe to commit.

### 4. Create plaintext secrets with your values
See examples [.examples/]

### 5. Seal the secrets
```bash
kubeseal \        
--cert platform/charts/secrets/sealed-secrets.crt \
--format yaml \
< <PATH_TO_PLAIN_SECRET_YAML> \
 > <PATH_TO_SEALED-SECRET_YAML>
```

### 6. Delete plaintext secrets
or ensure they are ignored

### deploy the sealed secret
```bash
kubectl create -f <PATH_TO_PLAIN_SECRET_YAML>
```