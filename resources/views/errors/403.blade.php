@extends('errors::minimal')

@section('title', __('Forbidden'))
@section('code', '403')
@section('message', __('Access denied'))
@section('hint', __($exception->getMessage() ?: "You don't have permission to view this page."))
