---
layout: post
title: Kubernetes - RBAC
categories: [devops, orchestration, kubernetes, hands-on]
tags: [Hands-On]
image: /assets/img/common/assignment.png
description: Lab assignment for understanding RBAC in Kubernetes
---

### Prerequisites

- Kubernetes
- kubectl

### Assignment

- Review the default KubeConfig file(if you connected atleast once to any cluster):

```sh
kubectl config view
```

- To view the hiddne information, use the parameter of --raw

```sh
kubectl config view --raw
```

- Review the certificate-authority-data string and decode it using base64:

```sh
CERTIFICATE_AUTHORITY_DATA=$(kubectl config view --raw | grep certificate-authority-data | awk -F': ' {'print $2'}) && echo $CERTIFICATE_AUTHORITY_DATA
```

```sh
echo $CERTIFICATE_AUTHORITY_DATA | base64 -d
```

- Check the certificate public key using openssl:

```sh
echo $CERTIFICATE_AUTHORITY_DATA | base64 -d | openssl x509 -text --noout
```

- Review the users using the user private key:

```sh
CLIENT_KEY_DATA=$(kubectl config view --raw | grep client-key-data | awk -F': ' {'print $2'}) && echo $CLIENT_KEY_DATA
```

```sh
echo $CLIENT_KEY_DATA | base64 -d
```

- Review the client-certificate-data which is where k8 rbac comes into picture:

```sh
CLIENT_CERTIFICATE_DATA=$(kubectl config view --raw | grep client-certificate-data | awk -F': ' {'print $2'}) && echo $CLIENT_CERTIFICATE_DATA
```

```sh
echo $CLIENT_CERTIFICATE_DATA | base64 -d
```

- Decode the data using openssl and note the client-certificate-data contains a subject line with O and CN, `O` for a Group and `CN` for a username:

```sh
echo $CLIENT_CERTIFICATE_DATA | base64 -d | openssl x509 -text --noout
```

### Cluster Role Bindings

- To understand Cluster Role Bindings in RBAC, lets review the Users, Groups and ServiceAccounts
- To view all the clusterrolebindings in the cluster:

```sh
kubectl get clusterrolebindings -o wide
```

- Note that group `system:masters` has a binding with `cluster-admin` and a role of `ClusterRole/cluster-admin`

- Review every resource and verb that is available:

```sh
kubectl api-resources --sort-by name -o wide | more
```

- Describe the clusterrolebindings and understand how our group, relates to the admin user:

```sh
kubectl describe ClusterRole/cluster-admin
```

### Create a Cluster Role and Binding

- Assumption: A group named `cluster-superheroes` is already created in external identity provider with the user `batman`, `superman` and `wonder-woman`.

- Create a super user group `cluster-superhero` by creating a clusterrole and clusterrolebinding with full permission:

```sh
kubectl create clusterrole cluster-superhero --verb='*' --resource='*'
```

```sh
kubectl create clusterrolebinding cluster-superhero --clusterrole=cluster-superhero --group=cluster-superheroes
```

- Check the newly created role and binding:

```sh
kubectl get clusterrolebindings -o wide | egrep 'Name|^cluster-'
```

- Use `kubectl auth can-i` to verify permissions: If our super user account can access any resource with any verb:

```sh
kubectl auth can-i '*' '*'
```

- Verify if the user `batman` who is part of the group `cluster-superheroes` has the access: 

```sh
kubectl auth can-i '*' '*' --as-group="cluster-superheroes" --as="batman"
```

```sh
kubectl auth can-i '*' '*' --as-group="cluster-superheroes" --as="superman"
```

```sh
kubectl auth can-i '*' '*' --as-group="cluster-superheroes" --as="wonder-woman"
```

### Configuring an RBAC User/Group Manually

- Create a user/group for use with RBAC

1. Generate an rsa private key for our user `batman`:

    ```sh
    openssl genrsa -out batman.key 4096
    ```

2. Create a certificate signing request(CSR) by providing private key, an output file and specify the subject information with CN and O for our user and group:

    ```sh
    openssl req -new -key batman.key -out batman.csr -subj "/CN=batman/O=cluster-superheroes" -sha256
    ```

3. Review the files:

    ```sh
    cat batman.key
    ```

    ```sh
    cat batman.csr
    ```

4. Create a Kubernetes Certificate Signing Request as yaml

    ```sh
    CSR_DATA=$(base64 batman.csr | tr -d '\n')
    ```

    ```sh
    CSR_USER=batman
    ```

    ```sh
    cat <<EOF > batman-csr-request.yaml
    apiVersion: certificates.k8s.io/v1
    kind: CertificateSigningRequest
    metadata:
      name: ${CSR_USER}
    spec:
      request: ${CSR_DATA}
      signerName: kubernetes.io/kube-apiserver-client
      usages:
      - client auth
    EOF
    ```

5. Review the yaml file to confirm the variable values:

    ```sh
    cat batman-csr-request.yaml
    ```

    ```sh
    kubectl apply -f batman-csr-request.yaml
    ```

6. Review the pending CSR in Kubernetes and and approve it:

    ```sh
    kubectl get certificatesigningrequest
    ```

    OR

    ```sh
    kubectl get csr
    ```

    ```sh
    kubectl certificate approve batman
    ```

    ```sh
    kubectl get csr
    ```

7. Query the signed certificate using json as output to view the certificate in base64:

    ```sh
    kubectl get csr batman -o json
    ```

    ```sh
    kubectl get csr batman -o jsonpath='{.status.certificate}'
    ```

    ```sh
    kubectl get csr batman -o jsonpath='{.status.certificate}' | base64 -d
    ```

    ```sh
    kubectl get csr batman -o jsonpath='{.status.certificate}' | base64 -d > batman.crt
    ```

    ```sh
    ls -l
    ```

8. Use openssl to decode the approved/signed certificate, and review the the subject line contains CN and O:

    ```sh
    openssl x509 -in batman.crt -text -noout
    ```

9. Create a new kubeconfig file for the user `batman` using existing kubeconfig file:

    ```sh
    cp /root/.kube/config batman-clustersuperheroes.config
    ```

    ```sh
    cat batman-clustersuperheroes.config
    ```

10. Clean the copied file using unset:

    ```sh
    KUBECONFIG=batman-clustersuperheroes.config kubectl config unset users.default
    ```

    ```sh
    KUBECONFIG=batman-clustersuperheroes.config kubectl config delete-context default
    ```

    ```sh
    KUBECONFIG=batman-clustersuperheroes.config kubectl config unset current-context
    ```

    ```sh
    cat batman-clustersuperheroes.config
    ```

11. Embed the new information for the user `batman`:

    ```sh
    KUBECONFIG=batman-clustersuperheroes.config kubectl config set-credentials batman --client-certificate=batman.crt --client-key=batman.key --embed-certs=true
    ```

    ```sh
    KUBECONFIG=batman-clustersuperheroes.config kubectl config set-context default --cluster=default --user=batman
    ```

    ```sh
    KUBECONFIG=batman-clustersuperheroes.config kubectl config use-context default
    ```

    ```sh
    cat batman-clustersuperheroes.config
    ```

12. Verify if the newly created kubeconfig is working as expected for the user `batman` as a super user: 

    ```sh
    KUBECONFIG=batman-clustersuperheroes.config kubectl get nodes
    ```

    ```sh
    KUBECONFIG=./batman-clustersuperheroes.config kubectl run nginx --image=nginx
    ```

    ```sh
    KUBECONFIG=./batman-clustersuperheroes.config kubectl delete pod/nginx --now
    ```


### Automating an RBAC Kubeconfig file

- Setup a convenient script for automating kubeconfig configurations:

```sh
cat kubeconfig-creator.sh <<EOF> 
#!/bin/bash

usage() { echo "Usage: $0 -u <username> -g <groupname> [-n <namespace>]" 1>&2; exit 1; }

while getopts u:g:n: flag
do
    case "${flag}" in
        u) K8S_USER=${OPTARG};;
        g) K8S_GROUP=${OPTARG};;
        n) K8S_NAMESPACE=${OPTARG};;
    esac
done

if [ -z "${K8S_USER}" ]; then
    usage
fi

if [ -z "${K8S_NAMESPACE}" ]; then
    K8S_NAMESPACE=default
fi

# Create an Alphanumeric User Group Combo
if [ -z "${K8S_GROUP}" ]; then
    COMBO=$(echo -n $K8S_USER | sed 's/[^a-zA-Z0-9]//g')
else
    COMBO=$(echo -n $K8S_USER | sed 's/[^a-zA-Z0-9]//g')-$(echo -n $K8S_GROUP | sed 's/[^a-zA-Z0-9]//g')
fi


# Colour escape codes
CYAN='\033[1;34m'
YELLOW='\033[1;33m'
GREEN='\033[1;32m'
NC='\033[0m'

echo -e "⚙️${CYAN} Stage 1 - User - Configuring user keys and certificate signing requests${NC}\n";
echo -e "✨ ${GREEN}Creating key for user ${COMBO} as ${COMBO}.key - ${CYAN}openssl genrsa -out ${COMBO}.key 4096${NC}"
openssl genrsa -out ${COMBO}.key 4096 >/dev/null 2>&1

if [ -z "${K8S_GROUP}" ]; then
    echo -e "✨ ${GREEN}Creating certificate signing request as ${COMBO}.cnf, ${CYAN}embedding CN=${K8S_USER}${NC}"
    openssl req -new -key ${COMBO}.key -out ${COMBO}.csr -subj "/CN=${K8S_USER}" -sha256
else
    echo -e "✨ ${GREEN}Creating certificate signing request as ${COMBO}.cnf, ${CYAN}embedding CN=${K8S_USER} and O=${K8S_GROUP}${NC}"
    openssl req -new -key ${COMBO}.key -out ${COMBO}.csr -subj "/CN=${K8S_USER}/O=${K8S_GROUP}" -sha256
fi

echo -e "✨ ${GREEN}Creating certificate signing request, kubernetes yaml declaration as ${COMBO}-csr.yaml${NC}"
cat <<EOF > ${COMBO}-csr.yaml
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: mycsr
spec:
EOF
if [ ! -z "${K8S_GROUP}" ]; then
    cat <<EOF >> ${COMBO}-csr.yaml
  groups:
  - ${K8S_GROUP}
EOF
fi
cat <<EOF >> ${COMBO}-csr.yaml
  request: $(cat ./${COMBO}.csr | base64 | tr -d '\n')
  signerName: kubernetes.io/kube-apiserver-client
  usages:
  - client auth
EOF

echo -e "\n⚙️${CYAN} Stage 2 - Kubernetes - Applying Certificate Signing Requests${NC}\n";
echo -e "✨ ${GREEN}Applying kubernetes yaml declaration - ${CYAN}kubectl apply -f ${COMBO}-csr.yaml${NC}"
kubectl apply -f ${COMBO}-csr.yaml >/dev/null 2>&1
echo -e "✨ ${GREEN}Approving kubernetes csr request - ${CYAN}kubectl certificate approve mycsr${NC}"
kubectl certificate approve mycsr >/dev/null 2>&1

echo -e "\n⚙️${CYAN} Stage 3 - Information Capture - Capturing information from Kubernetes${NC}\n";
echo -e "✨ ${GREEN}Capturing variable CLUSTER_NAME - ${CYAN}kubectl config view --minify -o jsonpath={.current-context}${NC}"
export CLUSTER_NAME=$(kubectl config view --minify -o jsonpath={.current-context})
echo -e "✨ ${GREEN}Capturing variable CLIENT_CERTIFICATE_DATA - ${CYAN}kubectl get csr mycsr -o jsonpath='{.status.certificate}'${NC}"
export CLIENT_CERTIFICATE_DATA=$(kubectl get csr mycsr -o jsonpath='{.status.certificate}')
echo -e "✨ ${GREEN}Capturing variable CLIENT_KEY_DATA - ${CYAN}cat ${COMBO}.key | base64 | tr -d '\\\n'${NC}"
export CLIENT_KEY_DATA=$(cat ${COMBO}.key | base64 | tr -d '\n')
echo -e "✨ ${GREEN}Capturing variable CLUSTER_CA - ${CYAN}kubectl config view --raw -o json | jq -r '.clusters[] | select(.name == \"'$(kubectl config current-context)'\") | .cluster.\"certificate-authority-data\"'${NC}"
export CLUSTER_CA=$(kubectl config view --raw -o json | jq -r '.clusters[] | select(.name == "'$(kubectl config current-context)'") | .cluster."certificate-authority-data"')
echo -e "✨ ${GREEN}Capturing variable CLUSTER_ENDPOINT - ${CYAN}kubectl config view --raw -o json | jq -r '.clusters[] | select(.name == \"'$(kubectl config current-context)'\") | .cluster.\"server\"'${NC}"
export CLUSTER_ENDPOINT=$(kubectl config view --raw -o json | jq -r '.clusters[] | select(.name == "'$(kubectl config current-context)'") | .cluster."server"')

echo -e "\n⚙️${CYAN} Stage 4 - Kubeconfig - Creating a Kubeconfig file with captured information${NC}\n";
echo -e "✨ ${GREEN}Creating Kubeconfig as ${COMBO}.config - ${YELLOW}Test with - ${CYAN}KUBECONFIG=./${COMBO}.config kubectl${NC}"
cat <<EOF > $COMBO.config
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: ${CLUSTER_CA}
    server: ${CLUSTER_ENDPOINT}
  name: ${CLUSTER_NAME}
users:
- name: ${COMBO}
  user:
    client-certificate-data: ${CLIENT_CERTIFICATE_DATA}
    client-key-data: ${CLIENT_KEY_DATA}
contexts:
- context:
    cluster: ${CLUSTER_NAME}
    user: ${COMBO}
    namespace: ${K8S_NAMESPACE}
  name: ${COMBO}-${CLUSTER_NAME}
current-context: ${COMBO}-${CLUSTER_NAME}
EOF

echo -e "\n⚙️${CYAN} Stage 5 - Cleanup - Moving temporary files from current directory, cleanup Kubernetes CSR${NC}\n";
CLEANUPDIR=tmp-${COMBO}-$(date '+%Y%m%d%H%M%S')
echo -e "🗑️  ${GREEN}Creating temporary files store - ${CYAN}mkdir ${CLEANUPDIR}${NC}"
mkdir ${CLEANUPDIR} 2>&1

echo -e "🗑️  ${GREEN}Cleanup ${COMBO}.key - ${CYAN}mv ${COMBO}.key ${CLEANUPDIR}${NC}"
mv ${COMBO}.key ${CLEANUPDIR}

echo -e "🗑️  ${GREEN}Cleanup ${COMBO}.csr - ${CYAN}mv ${COMBO}.csr ${CLEANUPDIR}${NC}"
mv ${COMBO}.csr ${CLEANUPDIR}

echo -e "🗑️  ${GREEN}Cleanup ${COMBO}-csr.yaml - ${CYAN}mv ${COMBO}-csr.yaml ${CLEANUPDIR}${NC}"
mv ${COMBO}-csr.yaml ${CLEANUPDIR} 

echo -e "🗑️  ${GREEN}Cleanup csr/mycsr - ${CYAN}kubectl delete csr/mycsr${NC}"
kubectl delete csr/mycsr >/dev/null 2>&1
EOF
```

### Continue User Creation:

- Create another user `superman`, similar to `batman` and verify his permissions:

```sh
./kubeconfig_creator.sh -u superman -g cluster-superheroes
```

```sh
KUBECONFIG=./superman-clustersuperheroes.config kubectl get nodes
```

- Create another user `wonder-woman`:

```sh
./kubeconfig_creator.sh -u wonder-woman -g cluster-superheroes
```

```sh
KUBECONFIG=./wonderwoman-clustersuperheroes.config kubectl get nodes
```

- Creating a watch only RBAC group by creating a ClusterRole that can only read resources with the verbs list,get,watch
- `Assumption`: A group named `cluster-viewers` is already created in an external identity provider.

```sh
kubectl create clusterrole cluster-watcher --verb=list,get,watch --resource='*'
```

- Create our binding for the group cluster-viewers group:

```sh
kubectl create clusterrolebinding cluster-watcher --clusterrole=cluster-watcher --group=cluster-watchers
```

- Check the auth against a user called `thanos` in this group for all resources v/s get,list,watch:

```sh
kubectl auth can-i '*' '*' --as-group="cluster-watchers" --as="thanos"
```

```sh
kubectl auth can-i 'list' '*' --as-group="cluster-watchers" --as="thanos"
```

- Let's create a KUBECONFIG file to test this for the `thanos` user -

```sh
./kubeconfig_creator.sh -u thanos -g cluster-watchers
```

```sh
KUBECONFIG=./thanos-clusterwatchers.config kubectl get nodes
```

```sh
KUBECONFIG=./thanos-clusterwatchers.config kubectl get pods
```

```sh
KUBECONFIG=./thanos-clusterwatchers.config kubectl run nginx --image=nginx
```

### Creating an RBAC managed user

- Create ClsuterRole and Binding for a standalone user, who will serve as a `pod manager` with the verbs list,get,create,delete and the resource as pods:

```sh
kubectl create clusterrole cluster-pod-manager --verb=list,get,create,delete --resource='pods'
```

```sh
kubectl create clusterrolebinding cluster-pod-manager --clusterrole=cluster-pod-manager --user=deadpool
```

- Verify the permissions with `auth can -i list *` as the user against all v/s pods:

```sh
kubectl auth can-i 'list' '*' --as="deadpool"
```

```sh
kubectl auth can-i 'list' 'pods' --as="deadpool"
```

- Check the ClusterRoleBindings to verify the user `deadpool` in the output:

```sh
kubectl get clusterrolebindings -o wide
```

- Create a KUBECONFIG file for just the user and review the output (O entry in the subject line):

```sh
./kubeconfig_creator.sh -u deadpool
```

- If we try to access pods as this user, it will work -

```sh
KUBECONFIG=./deadpool.config kubectl get pods
```

```sh
KUBECONFIG=./deadpool.config kubectl get secrets
```

### Using Roles and RoleBindings - Namespace Resource

- Let's switch to Roles and RoleBindings which are a namespaced resource, first we'll create a namespace called `gryffindor` -

```sh
kubectl create namespace gryffindor
```

- We'll create a role, in this new namespace with full access -

```sh
kubectl -n gryffindor create role gryffindor-admin --verb='*' --resource='*'
```

- And we'll create a RoleBinding and specify our group: 

```sh
kubectl -n gryffindor create rolebinding gryffindor-admin --role=gryffindor-admin --group=gryffindor-admins
```

- If we check our auth against the group, we'll be rejected if we don't specify a namespace, however, if we do it will work as expected:

```sh
kubectl auth can-i '*' '*' --as-group="gryffindor-admins" --as="harry"
```

```sh
kubectl -n gryffindor auth can-i '*' '*' --as-group="gryffindor-admins" --as="harry"
```s

- Let's create a kubeconfig file to the user `harry` and scoped at the namespace level:

```sh
./kubeconfig_creator.sh -u harry -g gryffindor-admins -n gryffindor
```

```sh
cat harry-gryffindoradmins.config
```

- Verify the permission for the user within and outside of the namespace:

```sh
KUBECONFIG=./harry-gryffindoradmins.config kubectl get nodes
```

```sh
KUBECONFIG=./harry-gryffindoradmins.config kubectl -n default get pods
```

```sh
KUBECONFIG=./harry-gryffindoradmins.config kubectl get pods
```

### Cleanup

- Execute the following commands, to cleanup:

```sh
rm -rf batman* kubeconfig-creator
kubectl delete namespace/gryffindor
kubectl delete clusterrole/cluster-superhero clusterrole/cluster-watcher clusterrole/cluster-pod-manager
kubectl delete clusterrolebinding/cluster-superhero clusterrolebinding/cluster-watcher clusterrolebinding/cluster-pod-manager
```