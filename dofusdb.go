package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

const dofusDBBaseURL = "https://api.dofusdb.fr"

// DofusItem is a search result from the DofusDB fan-site API, used to
// suggest real game items (with their icon) when naming a craft.
type DofusItem struct {
	Name   string `json:"name"`
	ImgURL string `json:"imgUrl"`
	Level  int64  `json:"level"`
}

var dofusDBClient = &http.Client{Timeout: 5 * time.Second}

func searchDofusItems(baseURL, query string) ([]DofusItem, error) {
	params := url.Values{}
	params.Set("name.fr[$regex]", query)
	params.Set("name.fr[$options]", "i")
	params.Set("$limit", "8")

	resp, err := dofusDBClient.Get(baseURL + "/items?" + params.Encode())
	if err != nil {
		return nil, fmt.Errorf("recherche DofusDB impossible: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("recherche DofusDB impossible: statut %d", resp.StatusCode)
	}

	var payload struct {
		Data []struct {
			Name struct {
				FR string `json:"fr"`
			} `json:"name"`
			Img   string `json:"img"`
			Level int64  `json:"level"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("recherche DofusDB impossible: %w", err)
	}

	items := []DofusItem{}
	for _, d := range payload.Data {
		if d.Name.FR == "" {
			continue
		}
		items = append(items, DofusItem{Name: d.Name.FR, ImgURL: d.Img, Level: d.Level})
	}
	return items, nil
}

// SearchDofusItems searches the live DofusDB API by French item name.
func SearchDofusItems(query string) ([]DofusItem, error) {
	return searchDofusItems(dofusDBBaseURL, query)
}
