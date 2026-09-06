#!/bin/bash
# domain-go.sh (2026-09-06): finishes the custom domain for the Digital Brain
# ONLY once the DNS record exists, because a CNAME file published before the
# record resolves makes GitHub redirect the working github.io address to a
# domain that does not answer and every phone on the team goes dark.
#
# THE ORDER and it is the whole point of this script:
#   1. Thulaib adds ONE record in Cloudflare for businessbooster.lk:
#        Type CNAME   Name brain   Target businessboosterlk.github.io
#        Proxy status: DNS only (grey cloud), so GitHub can issue the certificate.
#   2. He runs:  ~/bb-brain/domain-go.sh
#   3. This script waits for the record, writes the CNAME file, publishes through
#      the agent gate, then waits for HTTPS to answer and says so.
export PATH="$HOME/.local/node/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
DOMAIN="brain.businessbooster.lk"
cd "$HOME/bb-brain" || exit 1

echo "Waiting for $DOMAIN to point at GitHub (checking every 20 seconds, up to 15 minutes)."
for i in $(seq 1 45); do
  ANSWER=$(dig +short "$DOMAIN" 2>/dev/null | tr '\n' ' ')
  if echo "$ANSWER" | grep -q "github.io\|185.199.10[89]\|185.199.11[01]"; then
    echo "DNS answers: $ANSWER"
    break
  fi
  if [ "$i" = "45" ]; then
    echo "STOP: after 15 minutes $DOMAIN still does not point at GitHub (answer: '${ANSWER:-none}')."
    echo "Nothing was changed. Check the Cloudflare record (CNAME, name brain, target businessboosterlk.github.io, grey cloud) and run this again."
    exit 1
  fi
  sleep 20
done

if [ "$(cat CNAME 2>/dev/null)" != "$DOMAIN" ]; then
  echo "$DOMAIN" > CNAME
  echo "CNAME file written."
fi

echo "Publishing through the agent gate."
./brain-agent.sh || { echo "STOP: the agent refused to publish. Read agent.log. The CNAME file is in place but not live."; exit 1; }

echo "Waiting for HTTPS on $DOMAIN (GitHub mints the certificate, usually a few minutes, up to an hour)."
for i in $(seq 1 90); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAIN/" 2>/dev/null)
  if [ "$CODE" = "200" ]; then
    echo "LIVE: https://$DOMAIN/ answers 200."
    echo "Tell the team: open the new address, enter the team passcode once, add it to the home screen again."
    exit 0
  fi
  sleep 40
done
echo "The CNAME is published but HTTPS did not answer 200 within an hour (last code: ${CODE:-none})."
echo "Open the repository settings on GitHub, Pages and tick Enforce HTTPS once the certificate shows. Then open https://$DOMAIN/ yourself."
exit 1
